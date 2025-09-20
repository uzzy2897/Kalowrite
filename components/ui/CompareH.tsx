import React from "react";
import { Compare } from "./compare";


export function CompareH() {
  return (
    <div className="  lg:flex items-center justify-center   border-neutral-200 dark:border-neutral-800 ">
      <Compare
        firstImage="/c2.png"
        secondImage="/c1.png"
        firstImageClassName="object-contain object-left-top"
        secondImageClassname="object-contain object-left-top"
        className="w-full   md:h-[400px] md:w-[500px]"
        slideMode="drag"
      />
    </div>
  );
}
