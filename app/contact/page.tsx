"use client";

import { useState } from "react";
import { useGlobalContext } from "@/lib/context";
import { Mail, Phone, MapPin, Send, MessageSquare } from "lucide-react";

export default function ContactPage() {
    const { addMessage } = useGlobalContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "General Inquiry",
        message: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await addMessage(formData);
            setFormData({ name: "", email: "", subject: "General Inquiry", message: "" });
        } catch {
            // toast handled in context
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-12 md:py-20">
            <div className="max-w-5xl mx-auto">
                <header className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4">Get in Touch</h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Have a story to share, a question about an event, or want to join our media team? We'd love to hear from you.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Contact Information */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="p-8 rounded-2xl bg-primary text-primary-foreground shadow-xl">
                            <h3 className="text-2xl font-serif font-bold mb-6">Contact Info</h3>
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Email Us</p>
                                        <p className="text-sm text-primary-foreground/80">media@university.edu</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                        <Phone className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Call Us</p>
                                        <p className="text-sm text-primary-foreground/80">+1 (555) 123-4567</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Visit Us</p>
                                        <p className="text-sm text-primary-foreground/80">Student Center, Room 402<br />Main Campus</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-2xl border border-border/40 bg-card">
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-primary" /> Student Submissions
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                We accept Op-Eds, photo essays, and event coverage proposals. Please include "Submission" in your subject line.
                            </p>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-8">
                        <form onSubmit={handleSubmit} className="p-8 md:p-12 rounded-2xl border border-border/40 bg-card shadow-sm space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Your Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="John Doe"
                                        className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="john@example.com"
                                        className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subject</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                >
                                    <option>General Inquiry</option>
                                    <option>News Submission</option>
                                    <option>Event Proposal</option>
                                    <option>Media Access</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Message</label>
                                <textarea
                                    required
                                    placeholder="How can we help you?"
                                    className="w-full min-h-[200px] px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                />
                            </div>

                            <button
                                disabled={isSubmitting}
                                type="submit"
                                className="w-full md:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {isSubmitting ? "Sending..." : "Send Message"}
                                <Send className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
