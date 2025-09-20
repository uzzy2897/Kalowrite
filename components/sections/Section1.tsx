import React from "react"

const PartOne = () => {
  const logos = [
    "Trading-Broker-logo-1.webp",
    "Trading-Broker-logo-2.webp",
    "Trading-Broker-logo-3.webp",
    "Trading-Broker-logo-4.webp",
    "Trading-Broker-logo-5.webp",
  ]

  return (
    <section className="flex mt-6 py-8 flex-col items-center gap-6 border-b pb-8 mb-16">
      <h5 className="text-lg  font-semibold">Bypass some of the best AI detectors</h5>

      {/* Mobile horizontal scroll / Desktop grid */}
      <div className="w-full">
        <div className="flex lg:grid lg:grid-cols-5 gap-6 overflow-x-auto">
          {logos.map((img, i) => (
            <img
              key={i}
              src={`https://geteasycal.com/wp-content/uploads/2025/09/${img}`}
              className="h-8 flex-shrink-0"
              alt={`logo-${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default PartOne
