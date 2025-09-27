"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";


const ContactPage = () => {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Contact Us</h1>
      <form className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name">Name</label>
          <Input id="name" placeholder="Your name" />
        </div>

        <div className="space-y-2">
          <label htmlFor="email">Email</label>
          <Input id="email" type="email" placeholder="you@example.com" />
        </div>

        <div className="space-y-2">
          <label htmlFor="message">Message</label>
          <Textarea id="message" placeholder="Write your message..." rows={4} />
        </div>

        <Button type="submit" className="w-full">
          Send Message
        </Button>
      </form>
    </div>
  );
};

export default ContactPage;
