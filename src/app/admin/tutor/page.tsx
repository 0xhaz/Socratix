import { getTutorDashboard, type TutorDashboardData } from "@/app/admin/actions/getTutorDashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function TutorDashboardPage() {
  const data = await getTutorDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tutor Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Socratic attempt telemetry, misconception patterns, and generated practice review.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Attempts" value={String(data.totalAttempts)} description="Free-text submissions" />
        <MetricCard title="Students" value={String(data.totalStudents)} description="Students with attempts" />
        <MetricCard title="Next items" value={String(data.nextItemAttempts)} description="Unaided follow-up attempts" />
        <MetricCard
          title="Next-item correctness"
          value={formatPercent(data.nextItemCorrectRate)}
          description={`${data.nextItemCorrect} correct next items`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CounterCard title="Diagnosis Mix" description="How the tutor classified recent reasoning." counters={data.diagnosisCounts} />
        <CounterCard title="Misconceptions" description="Named misconceptions from structured diagnosis." counters={data.misconceptionCounts} />
      </div>

      <ConceptTable data={data} />
      <PendingReviewTable data={data} />
      <RecentAttemptsTable data={data} />
    </div>
  );
}

function MetricCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function CounterCard({
  title,
  description,
  counters,
}: {
  title: string;
  description: string;
  counters: TutorDashboardData["diagnosisCounts"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {counters.length > 0 ? (
          <div className="space-y-3">
            {counters.map((counter) => (
              <div key={counter.label} className="flex items-center justify-between gap-4 border-b pb-2 last:border-b-0">
                <span className="text-sm leading-5">{counter.label}</span>
                <Badge variant="secondary">{counter.count}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ConceptTable({ data }: { data: TutorDashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Concept Performance</CardTitle>
        <CardDescription>Attempts and next-item correctness by concept.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.conceptSummaries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concept</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Correct</TableHead>
                <TableHead>Conceptual</TableHead>
                <TableHead>Prereq gaps</TableHead>
                <TableHead>Next-item correct</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.conceptSummaries.map((concept) => (
                <TableRow key={concept.conceptName}>
                  <TableCell className="font-medium">{concept.conceptName}</TableCell>
                  <TableCell>{concept.attempts}</TableCell>
                  <TableCell>{concept.correct}</TableCell>
                  <TableCell>{concept.conceptual}</TableCell>
                  <TableCell>{concept.prerequisiteGaps}</TableCell>
                  <TableCell>{concept.nextItemsCorrect} / {concept.nextItems}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No concept attempts yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function PendingReviewTable({ data }: { data: TutorDashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Practice Review</CardTitle>
        <CardDescription>Generated next items that are visible to students and marked for instructor review.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.pendingReviewQuestions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lesson</TableHead>
                <TableHead>Concept</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.pendingReviewQuestions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell>{question.lessonTitle}</TableCell>
                  <TableCell>{question.conceptName}</TableCell>
                  <TableCell className="max-w-xl whitespace-normal leading-5">{question.stem}</TableCell>
                  <TableCell>{formatDate(question.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No generated practice awaiting review.</p>
        )}
      </CardContent>
    </Card>
  );
}

function RecentAttemptsTable({ data }: { data: TutorDashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Attempts</CardTitle>
        <CardDescription>Latest student submissions and diagnosis outcomes.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.recentAttempts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Lesson</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Next item</TableHead>
                <TableHead>Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentAttempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell>{attempt.studentName}</TableCell>
                  <TableCell>{attempt.lessonTitle}</TableCell>
                  <TableCell>
                    <Badge variant={attempt.isCorrect ? "secondary" : "outline"}>{attempt.diagnosisType}</Badge>
                  </TableCell>
                  <TableCell>{attempt.isNextItem ? "Yes" : "No"}</TableCell>
                  <TableCell className="max-w-xl whitespace-normal leading-5">{attempt.responseText}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No attempts yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "N/A";
  }

  return `${Math.round(value * 100)}%`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
