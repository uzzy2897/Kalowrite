import React from "react";

const steps = [
  {
    n:"1",
    img: "https://geteasycal.com/wp-content/uploads/2025/09/Step-1.png",
    title: "Paste Your AI Text",
    description: "Paste your AI content that you need humanized.",
  },
  {
    n:"2",
    img: "https://geteasycal.com/wp-content/uploads/2025/09/Step-2-1.png",
    title: "Click Humanize",
    description: "Click the Humanize button and wait a few seconds.",
  },
  {
    n:"3",
    img: "https://geteasycal.com/wp-content/uploads/2025/09/Step-3.png",
    title: "Voila!",
    description: "You now have 100% humanized content within seconds.",
  },
];

const SectionStep = () => {
  return (
    <div className="grid gap-6 md:grid-cols-3 mt-6">
      {steps.map((step, index) => (
        <div key={index} className="bg-card p-6  shadow-sm rounded-2xl">
          <img
            src={step.img}
            alt={step.title}
            className="w-full h-64 mb-4 border rounded-2xl bg-accent object-contain"
          />
          <div className="flex gap-4">
            <span className="p-3 border rounded-full h-12 w-12 flex items-center justify-center">{step.n}</span>
            <div>

            <h4 className="text-xl font-semibold">{step.title}</h4>
          <p className="text-muted-foreground">{step.description}</p>

            </div>
        
          </div>
        
        </div>
      ))}
    </div>
  );
};

export default SectionStep;
