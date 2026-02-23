import { GitPullRequest, Search, Users } from "lucide-react";
import { DiscoveryForm } from "~/components/discovery/discovery-form";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero + Discovery Form */}
      <section className="w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Find Your Next
            <br />
            <span className="text-primary">Open Source Contribution</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground sm:mt-6 sm:text-lg">
            Tell us about your skills and interests, and we will match you with
            projects and issues that are perfect for you.
          </p>
        </div>

        <DiscoveryForm />
      </section>

      {/* Features Section */}
      <section className="w-full border-t border-border bg-muted/30 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Search className="h-6 w-6" />}
            title="Smart Matching"
            description="Our AI-powered engine analyzes your preferences to find the most relevant projects and issues."
          />
          <FeatureCard
            icon={<GitPullRequest className="h-6 w-6" />}
            title="Curated Issues"
            description="Discover beginner-friendly issues labeled and categorized by difficulty across thousands of repositories."
          />
          <FeatureCard
            icon={<Users className="h-6 w-6" />}
            title="Community Driven"
            description="Join a growing community of developers finding meaningful ways to contribute to open source."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
