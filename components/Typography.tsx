import React from "react"

// H1
export function TypographyH1({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="scroll-m-20 text-3xl text-center   lg:text-5xl font-extrabold tracking-tight text-balance">
      {children}
    </h1>
  )
}

// H2
export function TypographyH2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="scroll-m-20  pb-2  text-xl lg:text-3xl  font-semibold tracking-tight first:mt-0">
      {children}
    </h2>
  )
}

// H3
export function TypographyH3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
      {children}
    </h3>
  )
}

// H4
export function TypographyH4({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
      {children}
    </h4>
  )
}

// Paragraph
export function TypographyP({ children }: { children: React.ReactNode }) {
  return (
    <p className="leading-7 text-center lg:text-center ">
      {children}
    </p>
  )
}

// Blockquote
export function TypographyBlockquote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="mt-6 border-l-2 pl-6 italic">
      {children}
    </blockquote>
  )
}

// List
export function TypographyList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
      {children}
    </ul>
  )
}

// Inline Code
export function TypographyInlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
      {children}
    </code>
  )
}

// Lead
export function TypographyLead({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-xl">
      {children}
    </p>
  )
}

// Muted
export function TypographyMuted({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-sm">{children}</p>
  )
}

// Small
export function TypographySmall({ children }: { children: React.ReactNode }) {
  return (
    <small className="text-sm leading-none font-medium">{children}</small>
  )
}

// Large
export function TypographyLarge({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-lg font-semibold">{children}</div>
  )
}
