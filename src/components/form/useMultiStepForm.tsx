'use client';

import type { JSX, ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

export interface MultiStepFormStep {
  fields: readonly string[];
  component: JSX.Element;
  title?: string;
  description?: string;
  heading?: string;
  subheading?: string;
  icon?: ReactNode;
}

export interface UseMultiStepFormReturn {
  steps: MultiStepFormStep[];
  currentStepIndex: number;
  currentStepData: MultiStepFormStep;
  progress: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  goToNext: () => Promise<boolean>;
  goToPrevious: () => void;
  goToFirstStep: () => void;
  goToStep: (stepNumber: number) => void;
  setSteps: (newSteps: MultiStepFormStep[]) => void;
}

const MultiStepFormContext = createContext<UseMultiStepFormReturn | null>(null);

interface MultiStepFormProviderProps {
  children: ReactNode;
  stepsFields: MultiStepFormStep[];
  onStepValidation?: (
    step: MultiStepFormStep
  ) => Promise<boolean> | boolean;
}

export function MultiStepFormProvider({
  children,
  stepsFields,
  onStepValidation,
}: MultiStepFormProviderProps) {
  const [steps, setStepsState] = useState<MultiStepFormStep[]>(stepsFields);
  const [currentStepIndex, setCurrentStepIndex] = useState(1);

  useEffect(() => {
    setStepsState(stepsFields);

    if (currentStepIndex > stepsFields.length) {
      setCurrentStepIndex(1);
    }
  }, [currentStepIndex, stepsFields]);

  const goToNext = async () => {
    const currentStepData = steps[currentStepIndex - 1];

    if (onStepValidation) {
      const isValid = await onStepValidation(currentStepData);
      if (!isValid) return false;
    }

    if (currentStepIndex < steps.length) {
      setCurrentStepIndex((prev) => prev + 1);
      return true;
    }

    return false;
  };

  const goToPrevious = () => {
    if (currentStepIndex > 1) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const goToFirstStep = () => {
    setCurrentStepIndex(1);
  };

  const goToStep = (stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= steps.length) {
      setCurrentStepIndex(stepNumber);
    }
  };

  const setSteps = (newSteps: MultiStepFormStep[]) => {
    setStepsState(newSteps);

    if (currentStepIndex > newSteps.length) {
      setCurrentStepIndex(1);
    }
  };

  return (
    <MultiStepFormContext.Provider
      value={{
        steps,
        currentStepIndex,
        currentStepData: steps[currentStepIndex - 1],
        progress: (currentStepIndex / steps.length) * 100,
        isFirstStep: currentStepIndex === 1,
        isLastStep: currentStepIndex === steps.length,
        goToNext,
        goToPrevious,
        goToFirstStep,
        goToStep,
        setSteps,
      }}
    >
      {children}
    </MultiStepFormContext.Provider>
  );
}

export function useMultiStepForm(): UseMultiStepFormReturn {
  const context = useContext(MultiStepFormContext);

  if (!context) {
    throw new Error(
      'useMultiStepForm must be used within a MultiStepFormProvider'
    );
  }

  return context;
}
