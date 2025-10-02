import React from 'react'
import { CompareH } from '../ui/CompareH'

const CompareHumanize = () => {
  return (
    
       <section className="grid grid-cols-1 lg:p-12 p-4 border  rounded-xl  justify-center gap-6 items-center">
       <div className="flex flex-col items-center">
         <h2 className="lg:w-2xl sm:w-full text-lg lg:text-4xl mb-6 text-center font-bold">
           Get natural sounding humanized content within seconds
         </h2>
         <p className="lg:w-xl sm:w-full text-muted-foreground text-center">
           Whether you’re writing an essay or an SEO blog article, KaloWrite ensures your text sounds
           natural and human. Your content transforms into natural and personal rather than robotic.
         </p>
       </div>
       <CompareH />
     </section>
  )
}

export default CompareHumanize