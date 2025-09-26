import React from "react";

const logos = [
  "/partner/logo1.png",
  "/partner/logo2.png",
  "/partner/logo3.png",
  "/partner/logo4.png",
  "/partner/logo5.png",
];

const PartOne = () => {
  return (
    <section className="flex mt-6 py-8 flex-col items-center gap-6 border-b pb-8 mb-16">
      <h5 className="text-xl lg:text-4xl font-semibold text-center">
        Bypass some of the best AI detectors
      </h5>

      {/* Mobile horizontal scroll / Desktop grid */}
      <div className="w-full">
        <div className="flex lg:grid lg:grid-cols-5 gap-6 overflow-x-auto no-scrollbar">
          {logos.map((src, i) => (
            <img
              key={i}
              src={src}
              className="h-10 lg:h-12 flex-shrink-0 mx-auto"
              alt={`partner-logo-${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartOne;
