import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DecorativeLine from '@/components/ui/DecorativeLine';
import DiamondIcon from '@/components/ui/DiamondIcon';
import { DIAMOND_SHAPES } from '@/constants/diamonds';

/**
 * SEO Metadata Configuration
 */
export const metadata: Metadata = {
  title: 'RITAMIE - Lab-Grown Diamonds | The Pinnacle of Innovation',
  description: 'Discover exquisite lab-grown diamonds at RITAMIE. The perfect choice for those seeking timeless beauty and sustainable value. Shop by shape and explore our ethical diamond collection.',
  keywords: ['lab-grown diamonds', 'diamonds', 'jewelry', 'sustainable diamonds', 'ethical jewelry', 'RITAMIE'],
  openGraph: {
    title: 'RITAMIE - Lab-Grown Diamonds',
    description: 'The perfect choice for those seeking timeless beauty and sustainable value.',
    type: 'website',
    images: [
      {
        url: '/images/banners/banner-diamond.png',
        width: 1200,
        height: 630,
        alt: 'RITAMIE Lab-Grown Diamonds',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RITAMIE - Lab-Grown Diamonds',
    description: 'The perfect choice for those seeking timeless beauty and sustainable value.',
    images: ['/images/banners/banner-diamond.png'],
  },
};

export default async function Home() {
  return (
    <div className="w-full">
      {/* Hero Banner Section */}
      <section className="h-[480px] relative w-full" aria-label="Hero banner">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/images/banners/banner-diamond.png"
            alt="Lab-Grown Diamonds"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-[18px] items-center text-center px-4 z-10">
          <h1 className="font-serif text-[#3d6373] text-[36px] tracking-[-0.72px] leading-[44px] max-w-4xl">
            Lab-Grown Diamonds - The Pinnacle of Innovation
          </h1>
          <p className="text-[#667085] text-[18px] leading-[28px] max-w-2xl">
            The perfect choice for those seeking timeless beauty and sustainable value.
          </p>
        </div>
      </section>

      {/* Shop by Shape Section */}
      <section className="min-h-[520px] w-full py-20" aria-labelledby="shop-by-shape-heading">
        <div className="container mx-auto px-4 max-w-[1408px]">
          {/* Decorative Line with Diamond Icon */}
          <div className="flex gap-5 items-center justify-center w-full mb-[68px]">
            <DecorativeLine variant="left-to-right" />
            <div className="flex items-center justify-center w-10 h-10">
              <DiamondIcon size="sm" color="#DEBE5F" />
            </div>
            <DecorativeLine variant="right-to-left" />
          </div>

          <div className="flex flex-col gap-10 items-center w-full">
            <h2 
              id="shop-by-shape-heading"
              className="font-serif text-[#101828] text-[24px] text-center leading-[32px]"
            >
              Shop by shape
            </h2>
            
            <div className="flex gap-10 items-center justify-center flex-wrap w-full">
              {DIAMOND_SHAPES.map((shape) => (
                <Link
                  key={shape.name}
                  href={`/diamonds-external?shape=${shape.name.toLowerCase()}`}
                  className="flex flex-col gap-5 items-center w-[200px] hover:opacity-70 transition-opacity"
                  aria-label={`Browse ${shape.name} shaped diamonds`}
                >
                  <div className="h-[200px] relative w-full overflow-hidden">
                    <Image
                      src={shape.image}
                      alt={`${shape.name} diamond shape`}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  </div>
                  <p className="text-[#1d2939] text-[20px] text-center leading-[30px] w-full">
                    {shape.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Overview Section - What is Lab-grown Diamond? */}
      <section 
        className="min-h-[1124px] lg:min-h-[1124px] relative w-full overflow-hidden py-20"
        aria-labelledby="overview-heading"
      >
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Left Image */}
            <div className="relative h-[400px] lg:h-[900px] w-full order-1 lg:order-1">
              <Image
                src="/images/sections/overview-left.png"
                alt="Lab-grown diamond close-up view"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            
            {/* Right Content */}
            <div className="flex flex-col gap-10 items-start lg:items-end justify-center text-left lg:text-right order-2 lg:order-2 lg:pl-8">
              <h2 
                id="overview-heading"
                className="font-serif text-[#1d2939] text-[28px] lg:text-[36px] tracking-[-0.72px] leading-[36px] lg:leading-[44px]"
              >
                What is Lab-grown Diamond?
              </h2>
              <p className="text-[#667085] text-[16px] lg:text-[18px] leading-[24px] lg:leading-[28px]">
                Lab-grown diamonds are created in a laboratory setting by scientists, possessing the same chemical composition and visual properties as natural diamonds. The main distinctions between lab-grown and natural diamonds lie in their origin and rarity, with lab-grown diamonds being more accessible due to their controlled production process.
              </p>
            </div>

            {/* Right Image - Full width on mobile, positioned on desktop */}
            <div className="relative h-[400px] lg:h-[702px] w-full lg:absolute lg:right-0 lg:top-[392px] lg:w-[702px] order-3 lg:order-3 mt-8 lg:mt-0">
              <Image
                src="/images/sections/overview-right.png"
                alt="Lab-grown diamond detail showing brilliance"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 702px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Reason Section - The reason Choosing RITAMIE */}
      <section 
        className="bg-[#f2f4f7] min-h-[720px] relative w-full overflow-hidden"
        aria-labelledby="reason-heading"
      >
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[720px] py-20">
            {/* Content */}
            <div className="flex flex-col gap-8 items-center lg:items-start text-center lg:text-left z-10">
              <div className="flex items-center justify-center w-[100px] h-[100px]" aria-hidden="true">
                <DiamondIcon size="lg" color="#0F1A25" />
              </div>
              <h2 
                id="reason-heading"
                className="font-serif text-[#1d2939] text-[28px] lg:text-[36px] text-center lg:text-left tracking-[-0.72px] leading-[36px] lg:leading-[44px]"
              >
                The reason Choosing RITAMIE
              </h2>
              <p className="text-[#667085] text-[16px] lg:text-[18px] text-center lg:text-left leading-[24px] lg:leading-[28px] w-full max-w-[675px]">
                Our lab-grown diamonds combine stunning beauty with ethical craftsmanship, designed for those who want brilliance without compromise.
              </p>
              <Link href="/diamonds-external" aria-label="Explore our diamond collection">
                <Button className="bg-[#3d6373] hover:bg-[#3d6373]/90 text-white px-7 py-4 text-[16px] lg:text-[18px] leading-[24px] lg:leading-[28px] border border-[#3d6373] shadow-sm">
                  Explore More
                </Button>
              </Link>
            </div>

            {/* Right Image */}
            <div className="relative h-[400px] lg:h-[721px] w-full order-2">
              <Image
                src="/images/sections/reason-section.png"
                alt="RITAMIE lab-grown diamonds collection"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
