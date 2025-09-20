import FAQ from '@/components/sections/FAQ'
import Hero from '@/components/sections/Hero'
import PartOne from '@/components/sections/Section1'
import PartTwo from '@/components/sections/Section2'
import CompareHumanize from '@/components/sections/Section3'
import Section4 from '@/components/sections/Section4'
import React from 'react'


const page = () => {
  return (
    <main className='px-4 lg:px-8 max-w-7xl mx-auto space-y-24'>
      <Hero/>
      <PartOne/>
      <PartTwo/>
      <CompareHumanize/>
      <Section4/>
      <FAQ/>

    </main>
  )
}

export default page