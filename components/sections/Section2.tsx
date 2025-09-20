import React from 'react'

const PartTwo = () => {
  return (
    <section className="grid grid-cols-1 p-4 lg:p-12 border bg-card rounded-xl  justify-center gap-6 items-center mb-16">
    <div className="flex lg:flex-row flex-col justify-between">
      <h2 className="lg:w-xl sm:w-full text-lg lg:text-4xl mb-6 font-bold">
        Built and tested against the world's best AI detection tools
      </h2>
      <p className="lg:w-xl sm:w-full text-muted-foreground">
        We studied some of the world’s best AI detection models and reverse engineered them.
        KaloWrite breaks down your content and its semantics and removes key AI patterns such as
        perplexity and burstiness.
      </p>
    </div>
    <img className="hidden lg:flex" src="illust3.png" alt="" />
    <img className="lg:hidden flex" src="illust.png" alt="" />
  </section>
  )
}

export default PartTwo