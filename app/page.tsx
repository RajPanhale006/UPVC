import { WorkshopApp } from "@/components/workshop/workshop-app";
import { BrandHeader } from "@/components/brand/shivshakti-logo";
import { PRODUCT_TAGLINE } from "@/lib/brand";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <WorkshopApp />
      <footer className="mt-auto hidden border-t border-slate-200 bg-white px-6 py-5 md:block">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <BrandHeader logoSize={56} showTagline={false} className="sm:flex-row sm:gap-3" />
          <p className="text-center text-xs text-slate-500 sm:text-right">
            {PRODUCT_TAGLINE}
          </p>
        </div>
      </footer>
    </div>
  );
}
