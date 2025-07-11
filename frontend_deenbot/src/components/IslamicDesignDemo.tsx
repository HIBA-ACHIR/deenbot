import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * This is a demo component showcasing the Islamic design elements
 * It demonstrates how to use the various CSS classes defined in index.css
 */
const IslamicDesignDemo: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Main heading with Islamic styling */}
      <h1 className="islamic-heading text-3xl font-bold mb-8 text-center">
        بسم الله الرحمن الرحيم
      </h1>
      
      {/* Decorative divider */}
      <div className="islamic-divider my-8"></div>
      
      {/* Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Islamic Card Example */}
        <div className="islamic-card p-6">
          <h2 className="text-xl font-semibold mb-4">
            Card with Subtle Pattern
          </h2>
          <p className="mb-4">
            This card has a subtle zellij pattern background overlay, creating
            an elegant Islamic aesthetic while maintaining readability.
          </p>
          <Button className="islamic-button bg-primary text-white">
            إستكشاف المزيد
          </Button>
        </div>
        
        {/* Ornament Card Example */}
        <div className="ornament-card">
          <h2 className="text-xl font-semibold mb-4">
            Card with Ornate Border
          </h2>
          <p className="mb-4">
            This card style features an elegant double-border inspired by
            traditional Islamic manuscripts.
          </p>
          <Button className="islamic-button bg-secondary text-secondary-foreground">
            معرفة المزيد
          </Button>
        </div>
      </div>
      
      {/* Content section with Moroccan background */}
      <div className="moroccan-section p-8 rounded-lg my-8 bg-accent">
        <h2 className="text-2xl font-bold mb-4">
          Section with Moroccan Pattern
        </h2>
        <p className="mb-4">
          This section uses a subtle Moroccan zellij pattern as a background,
          adding cultural context while maintaining readability.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-2">الإسلام</h3>
            <p className="arabic-text">
              الإسلام هو دين التوحيد والسلام
            </p>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-2">الإيمان</h3>
            <p className="arabic-text">
              الإيمان هو التصديق والعمل
            </p>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-2">الإحسان</h3>
            <p className="arabic-text">
              الإحسان هو أن تعبد الله كأنك تراه
            </p>
          </Card>
        </div>
      </div>
      
      {/* Another decorative divider */}
      <div className="islamic-divider my-8"></div>
      
      {/* Footer section */}
      <footer className="text-center mb-8">
        <p className="text-sm text-muted-foreground">
          DeenBot - Your Islamic Assistant © 2025
        </p>
      </footer>
    </div>
  );
};

export default IslamicDesignDemo;
