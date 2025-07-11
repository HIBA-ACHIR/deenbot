import React from "react";
import { Button } from "@/components/ui/button";
import Layout from "../components/Layout";

const IslamicDesignTest: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="islamic-heading text-3xl mb-6 text-center">
          بسم الله الرحمن الرحيم
        </h1>
        
        <div className="islamic-divider mb-10"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="islamic-card p-8">
            <h2 className="text-2xl font-bold mb-4 font-['Aref_Ruqaa',_serif]">Islamic Card Example</h2>
            <p className="mb-6">
              This card has a subtle zellij pattern background overlay, creating
              an elegant Islamic aesthetic.
            </p>
            <Button className="islamic-button bg-primary text-white">
              Example Button
            </Button>
          </div>
          
          <div className="ornament-card p-8">
            <h2 className="text-2xl font-bold mb-4 font-['Aref_Ruqaa',_serif]">Ornament Card Example</h2>
            <p className="mb-6">
              This card style features an elegant double-border inspired by
              traditional Islamic manuscripts.
            </p>
            <Button className="islamic-button bg-secondary text-secondary-foreground">
              Secondary Button
            </Button>
          </div>
        </div>
        
        <div className="moroccan-section p-8 rounded-lg my-10">
          <h2 className="text-2xl font-bold mb-4 text-center">Moroccan Pattern Section</h2>
          <p className="text-center mb-6">
            This section uses a subtle Moroccan zellij pattern as a background.
          </p>
        </div>

        <div className="islamic-divider my-10"></div>
        
        <div className="text-center">
          <p className="font-['Scheherazade_New',_serif] text-2xl">
            نموذج للخط العربي الجميل
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default IslamicDesignTest;
