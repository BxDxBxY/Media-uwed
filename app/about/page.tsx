import { Mail, Phone, MapPin } from "lucide-react";

export default function AboutPage() {
    const team = [
        { name: "Dr. Alan Grant", role: "Faculty Advisor", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2670&auto=format&fit=crop" },
        { name: "Sarah Connor", role: "Editor-in-Chief", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=2670&auto=format&fit=crop" },
        { name: "James T. Kirk", role: "Lead Photographer", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=2670&auto=format&fit=crop" },
        { name: "Nyota Uhura", role: "Head of Communications", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=2670&auto=format&fit=crop" },
    ];

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <header className="mb-16 text-center">
                <h1 className="text-3xl md:text-5xl font-serif font-bold mb-6">About Us</h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                    University Media is the independent, student-run news organization dedicated to serving the campus community with integrity, accuracy, and creativity.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 items-center">
                <div className="space-y-6">
                    <h2 className="text-2xl font-serif font-bold">Our Mission</h2>
                    <div className="prose dark:prose-invert">
                        <p>
                            Established in 1995, our mission is to provide a platform for student voices and to keep the university community informed about the issues that matter. We believe in the power of storytelling to foster connection and drive positive change.
                        </p>
                        <p>
                            We cover everything from administrative decisions and student government to sports, arts, and campus culture. Our team is comprised of dedicated student journalists, photographers, and designers from diverse academic backgrounds.
                        </p>
                    </div>
                </div>
                <div className="aspect-square relative rounded-2xl overflow-hidden bg-muted">
                    <img
                        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2670&auto=format&fit=crop"
                        alt="Editorial Team working together"
                        className="object-cover w-full h-full"
                    />
                </div>
            </div>

            <div className="mb-20">
                <h2 className="text-2xl font-serif font-bold text-center mb-12">Meet the Team</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                    {team.map((member, i) => (
                        <div key={i} className="text-center group">
                            <div className="aspect-square rounded-full overflow-hidden mx-auto mb-4 border-2 border-border/40 w-32 h-32 relative">
                                <img
                                    src={member.image}
                                    alt={member.name}
                                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                                />
                            </div>
                            <h3 className="font-bold text-lg">{member.name}</h3>
                            <p className="text-sm text-primary">{member.role}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-muted/30 rounded-2xl p-8 md:p-12 text-center space-y-8">
                <h2 className="text-2xl font-serif font-bold">Contact Us</h2>
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-primary shadow-sm">
                            <Mail className="h-5 w-5" />
                        </div>
                        <p className="font-medium">editor@university.edu</p>
                        <p className="text-xs text-muted-foreground">For press releases & tips</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-primary shadow-sm">
                            <Phone className="h-5 w-5" />
                        </div>
                        <p className="font-medium">+1 (555) 123-4567</p>
                        <p className="text-xs text-muted-foreground">Newsroom Direct Line</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-primary shadow-sm">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <p className="font-medium">Student Center, Room 304</p>
                        <p className="text-xs text-muted-foreground">University Campus</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
