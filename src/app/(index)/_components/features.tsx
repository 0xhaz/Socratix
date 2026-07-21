"use client";
import { Badge } from "@/components/ui/badge";
import { MessageCircleQuestion, Brain, ShieldCheck, ChartLine } from "lucide-react";

export const Features = () => {
  const features = [
    {
      title: "Socratic Tutoring",
      description: "The tutor never gives the answer away. It diagnoses the misconception beneath a wrong attempt and guides you with questions until you work it out yourself.",
      icon: MessageCircleQuestion,
      color: "bg-blue-500",
      borderHover: "hover:border-blue-500/40",
      gradient: "from-blue-400/10",
    },
    {
      title: "Persistent Memory",
      description: "Your tutor remembers you across sessions — which concepts you've mastered and which misconceptions you've resolved — and picks up right where you left off.",
      icon: Brain,
      color: "bg-emerald-500",
      borderHover: "hover:border-emerald-500/40",
      gradient: "from-emerald-400/10",
    },
    {
      title: "Instructors in Control",
      description: "Teachers own the syllabus and the concept graph. Every lesson, question, and hint is approved before a student sees it — the AI scaffolds, it doesn't set the curriculum.",
      icon: ShieldCheck,
      color: "bg-amber-500",
      borderHover: "hover:border-amber-500/40",
      gradient: "from-amber-400/10",
    },
    {
      title: "Misconception Insights",
      description: "See who's stuck and why, not just who scored low. Named misconceptions and next-item correctness surface straight back to the instructor.",
      icon: ChartLine,
      color: "bg-purple-500",
      borderHover: "hover:border-purple-500/40",
      gradient: "from-purple-400/10",
    }
  ];

  return (
    <section id="features" className=" bg-transparent py-10 relative">
      {/* Soft radial background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02),transparent_60%)] pointer-events-none z-0" />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <Badge variant="secondary" className="bg-primary/10 text-primary mb-4">
            How it works
          </Badge>
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            Not another answer machine
          </h2>
          <p className="text-muted-foreground text-lg">
            Socratix diagnoses reasoning, not just right and wrong — and keeps teachers in control of everything students see.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 transition-all duration-300 ${feature.borderHover}`}
            >
              {/* Hover gradient overlay */}
              <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${feature.gradient} to-transparent`} />

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-5 shadow-md`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
