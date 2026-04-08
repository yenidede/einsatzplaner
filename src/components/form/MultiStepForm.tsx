'use client';
import type { VariantProps } from 'class-variance-authority';
import { AnimatePresence, type MotionProps, motion } from 'framer-motion';
import * as React from 'react';
import { Button, type buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';
import {
  MultiStepFormProvider,
  useMultiStepForm,
} from '@/components/form/useMultiStepForm';

const NextButton = (
  props: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
) => {
  const { isLastStep, goToNext } = useMultiStepForm();
  if (isLastStep) return null;
  return (
    <Button size="sm" type="button" onClick={() => goToNext()} {...props} />
  );
};

const PreviousButton = (
  props: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
) => {
  const { isFirstStep, goToPrevious } = useMultiStepForm();
  if (isFirstStep) return null;
  return (
    <Button
      size="sm"
      type="button"
      variant="outline"
      onClick={() => goToPrevious()}
      {...props}
    />
  );
};

const SubmitButton = (
  props: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
) => {
  const { isLastStep } = useMultiStepForm();
  if (!isLastStep) return null;
  return <Button size="sm" type="submit" {...props} />;
};

const ResetButton = (
  props: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
) => {
  return <Button size="sm" type="button" variant="ghost" {...props} />;
};

const FormHeader = (props: React.ComponentProps<'div'>) => {
  const { currentStepIndex, steps } = useMultiStepForm();
  return (
    <div
      className="flex shrink-0 flex-col items-start justify-center gap-5"
      {...props}
    >
      <Stepper
        value={currentStepIndex}
        orientation="horizontal"
        className="w-full items-center gap-3"
      >
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isLast = stepNumber === steps.length;
          return (
            <StepperItem
              key={stepNumber}
              step={stepNumber}
              className="items-center not-last:flex-1"
            >
              <StepperTrigger className="items-center gap-3 rounded-2xl">
                <StepperIndicator className="size-9 rounded-full text-xs">
                  {step.icon}
                </StepperIndicator>
                <div className="flex min-w-0 flex-col gap-0.5 text-left">
                  {step.title ? (
                    <StepperTitle>{step.title}</StepperTitle>
                  ) : null}
                  {step.description ? (
                    <StepperDescription>{step.description}</StepperDescription>
                  ) : null}
                </div>
              </StepperTrigger>
              {!isLast && <StepperSeparator className="self-center" />}
            </StepperItem>
          );
        })}
      </Stepper>
    </div>
  );
};
const FormFooter = ({ children, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div
      className="flex w-full shrink-0 items-end justify-between pt-2"
      {...props}
    >
      <p className="text-muted-foreground text-xs">*Pflichtfeld</p>
      {children}
    </div>
  );
};

const StepFields = (props: React.ComponentProps<'div'> & MotionProps) => {
  const { currentStepIndex, steps } = useMultiStepForm();
  const currentFormStep = steps[currentStepIndex - 1];
  if (
    !currentFormStep ||
    currentStepIndex < 1 ||
    currentStepIndex > steps.length
  ) {
    return null;
  }
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={currentStepIndex}
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -15 }}
        transition={{ duration: 0.4, type: 'spring' }}
        {...props}
        className="grid w-full grid-cols-1 gap-5 md:grid-cols-2"
      >
        {currentFormStep.component}
      </motion.div>
    </AnimatePresence>
  );
};

function MultiStepFormContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex min-h-0 flex-1 flex-col gap-2', className)}
      {...props}
    />
  );
}

export {
  MultiStepFormProvider,
  MultiStepFormContent,
  FormHeader,
  FormFooter,
  StepFields,
  // Form Actions
  NextButton,
  PreviousButton,
  SubmitButton,
  ResetButton,
};
