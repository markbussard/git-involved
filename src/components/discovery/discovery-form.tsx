"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { ArrowLeft, ArrowRight, Pencil, Search } from "lucide-react";

import { SelectionCard } from "~/components/discovery/selection-card";
import { StepIndicator } from "~/components/discovery/step-indicator";
import { ToggleChip } from "~/components/discovery/toggle-chip";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  EXPERIENCE_LEVELS,
  INTERESTS,
  LANGUAGES,
  REPO_SIZES,
  type DiscoveryQuery,
  type ExperienceLevel,
  type Interest,
  type Language,
  type RepoSize,
} from "~/lib/discovery/constants";

const TOTAL_STEPS = 5;

export function DiscoveryForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>([]);
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [selectedRepoSizes, setSelectedRepoSizes] = useState<RepoSize[]>([]);

  const toggleLanguage = useCallback((lang: Language) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  }, []);

  const toggleInterest = useCallback((interest: Interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  }, []);

  const toggleRepoSize = useCallback((size: RepoSize) => {
    setSelectedRepoSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  }, []);

  const canContinue = (): boolean => {
    switch (currentStep) {
      case 0:
        return selectedLanguages.length > 0;
      case 1:
        return experienceLevel !== null;
      case 2:
        return true; // interests are optional
      case 3:
        return selectedRepoSizes.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleContinue = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (!experienceLevel) return;

    const query: DiscoveryQuery = {
      languages: selectedLanguages,
      experienceLevel,
      interests: selectedInterests,
      repoSizes: selectedRepoSizes,
    };

    const encoded = btoa(JSON.stringify(query));
    router.push(`/discover?q=${encoded}`);
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const getLabelForValue = <T extends { value: string; label: string }>(
    items: readonly T[],
    value: string,
  ): string => {
    const item = items.find((i) => i.value === value);
    return item?.label ?? value;
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8">
        <StepIndicator totalSteps={TOTAL_STEPS} currentStep={currentStep} />
      </div>

      <div className="min-h-[340px]">
        {/* Step 1: Languages */}
        {currentStep === 0 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-foreground mb-2 text-2xl font-bold">
              What languages do you work with?
            </h2>
            <p className="text-muted-foreground mb-6">
              Select one or more programming languages you are comfortable with.
            </p>
            <div className="flex flex-wrap gap-3">
              {LANGUAGES.map((lang) => (
                <ToggleChip
                  key={lang.value}
                  label={lang.label}
                  selected={selectedLanguages.includes(lang.value)}
                  onToggle={() => toggleLanguage(lang.value)}
                />
              ))}
            </div>
            {selectedLanguages.length === 0 && (
              <p className="text-muted-foreground/70 mt-4 text-sm">
                Select at least one language to continue.
              </p>
            )}
          </div>
        )}

        {/* Step 2: Experience Level */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-foreground mb-2 text-2xl font-bold">
              What is your experience level?
            </h2>
            <p className="text-muted-foreground mb-6">
              This helps us find issues that match your skill level.
            </p>
            <div className="flex flex-col gap-3">
              {EXPERIENCE_LEVELS.map((level) => (
                <SelectionCard
                  key={level.value}
                  title={level.label}
                  description={level.description}
                  selected={experienceLevel === level.value}
                  onSelect={() => setExperienceLevel(level.value)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Interests */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-foreground mb-2 text-2xl font-bold">
              What areas interest you?
            </h2>
            <p className="text-muted-foreground mb-6">
              Optionally narrow down by topic. You can skip this step.
            </p>
            <div className="flex flex-wrap gap-3">
              {INTERESTS.map((interest) => (
                <ToggleChip
                  key={interest.value}
                  label={interest.label}
                  selected={selectedInterests.includes(interest.value)}
                  onToggle={() => toggleInterest(interest.value)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Repository Size */}
        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-foreground mb-2 text-2xl font-bold">
              What size of project are you looking for?
            </h2>
            <p className="text-muted-foreground mb-6">
              Select one or more project sizes. At least one is required.
            </p>
            <div className="flex flex-col gap-3">
              {REPO_SIZES.map((size) => (
                <SelectionCard
                  key={size.value}
                  title={size.label}
                  description={size.description}
                  selected={selectedRepoSizes.includes(size.value)}
                  onSelect={() => toggleRepoSize(size.value)}
                />
              ))}
            </div>
            {selectedRepoSizes.length === 0 && (
              <p className="text-muted-foreground/70 mt-4 text-sm">
                Select at least one size to continue.
              </p>
            )}
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-foreground mb-2 text-2xl font-bold">
              Review your preferences
            </h2>
            <p className="text-muted-foreground mb-6">
              Confirm your selections, then search for matching projects.
            </p>

            <div className="border-border bg-card space-y-5 rounded-xl border p-6">
              {/* Languages */}
              <ReviewSection title="Languages" onEdit={() => goToStep(0)}>
                <div className="flex flex-wrap gap-2">
                  {selectedLanguages.map((lang) => (
                    <span
                      key={lang}
                      className="bg-primary/10 text-primary inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                    >
                      {getLabelForValue(LANGUAGES, lang)}
                    </span>
                  ))}
                </div>
              </ReviewSection>

              <Separator />

              {/* Experience Level */}
              <ReviewSection
                title="Experience Level"
                onEdit={() => goToStep(1)}
              >
                <span className="text-foreground text-sm">
                  {experienceLevel
                    ? getLabelForValue(EXPERIENCE_LEVELS, experienceLevel)
                    : "Not selected"}
                </span>
              </ReviewSection>

              <Separator />

              {/* Interests */}
              <ReviewSection title="Interests" onEdit={() => goToStep(2)}>
                {selectedInterests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedInterests.map((interest) => (
                      <span
                        key={interest}
                        className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                      >
                        {getLabelForValue(INTERESTS, interest)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    No preferences (all topics)
                  </span>
                )}
              </ReviewSection>

              <Separator />

              {/* Repository Sizes */}
              <ReviewSection title="Repository Size" onEdit={() => goToStep(3)}>
                <div className="flex flex-wrap gap-2">
                  {selectedRepoSizes.map((size) => (
                    <span
                      key={size}
                      className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                    >
                      {getLabelForValue(REPO_SIZES, size)}
                    </span>
                  ))}
                </div>
              </ReviewSection>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {currentStep < TOTAL_STEPS - 1 ? (
          <Button
            onClick={handleContinue}
            disabled={!canContinue()}
            className="gap-2"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="gap-2">
            <Search className="h-4 w-4" />
            Find Projects
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          {title}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}
