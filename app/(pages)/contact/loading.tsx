"use client";

export default function LoadingContactPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4 animate-pulse">
      {/* Header */}
      <div className="h-8 w-48 bg-card rounded-md" />
      <div className="h-4 w-72 bg-card rounded-md" />

      {/* Form */}
      <div className="space-y-6 mt-6">
        {/* Name */}
        <div className="space-y-2">
          <div className="h-4 w-16 bg-card rounded-md" />
          <div className="h-10 w-full bg-card rounded-md" />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <div className="h-4 w-16 bg-card rounded-md" />
          <div className="h-10 w-full bg-card rounded-md" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <div className="h-4 w-20 bg-card rounded-md" />
          <div className="h-28 w-full bg-card rounded-md" />
        </div>

        {/* Button */}
        <div className="h-10 w-full bg-card rounded-md" />
      </div>
    </div>
  );
}
