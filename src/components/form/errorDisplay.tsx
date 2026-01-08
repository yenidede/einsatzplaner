import React from 'react';

export default function ErrorDisplay({ errors }: { errors: string[] }) {
  return (
    <div className="mt-1 text-sm text-red-500">
      <p>{errors.join('. ') + '.'}</p>
    </div>
  );
}
