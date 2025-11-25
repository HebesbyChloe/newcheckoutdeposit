'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export interface AccordionItemData {
  title: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

export interface AccordionModuleProps {
  items: AccordionItemData[];
  allowMultiple?: boolean;
  className?: string;
}

export function AccordionModule({ 
  items, 
  allowMultiple = false,
  className = "" 
}: AccordionModuleProps) {
  const defaultValue = items
    .filter(item => item.defaultOpen)
    .map((_, index) => `item-${index}`);

  const accordionItems = items.map((item, index) => (
    <AccordionItem key={index} value={`item-${index}`}>
      <AccordionTrigger className="text-[#1d2939] hover:text-[#2c5f6f]">
        {item.title}
      </AccordionTrigger>
      <AccordionContent className="text-[#667085]">
        {item.content}
      </AccordionContent>
    </AccordionItem>
  ));

  if (allowMultiple) {
    return (
      <Accordion 
        type="multiple"
        defaultValue={defaultValue}
        className={className}
      >
        {accordionItems}
      </Accordion>
    );
  }

  return (
    <Accordion 
      type="single"
      collapsible
      defaultValue={defaultValue[0]}
      className={className}
    >
      {accordionItems}
    </Accordion>
  );
}

export default AccordionModule;
