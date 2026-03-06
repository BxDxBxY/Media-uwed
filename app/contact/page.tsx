"use client";

import { useMemo, useState } from "react";
import { useGlobalContext } from "@/lib/context";
import { Mail, Phone, MapPin, Send, MessageSquare } from "lucide-react";

const SUBJECT_OPTIONS = [
  { value: "general", en: "General Inquiry", ru: "Общий вопрос", uz: "Umumiy so'rov" },
  { value: "news", en: "News Submission", ru: "Отправка новости", uz: "Yangilik yuborish" },
  { value: "event", en: "Event Proposal", ru: "Предложение события", uz: "Tadbir taklifi" },
  { value: "media", en: "Media Access", ru: "Доступ к медиа", uz: "Media ruxsati" },
  { value: "other", en: "Other", ru: "Другое", uz: "Boshqa" },
] as const;

export default function ContactPage() {
  const { addMessage, language } = useGlobalContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "general",
    message: "",
  });

  const t = useMemo(() => {
    if (language === "ru") {
      return {
        title: "Свяжитесь с нами",
        subtitle:
          "Есть новость, вопрос о мероприятии или хотите присоединиться к нашей медиа-команде? Мы будем рады вашему сообщению.",
        contactInfo: "Контакты",
        emailUs: "Напишите нам",
        callUs: "Позвоните нам",
        visitUs: "Приходите к нам",
        submissions: "Материалы студентов",
        submissionsText:
          "Мы принимаем статьи, фотоистории и предложения по освещению событий. Укажите в теме слово «Submission».",
        yourName: "Ваше имя",
        email: "Email",
        subject: "Тема",
        message: "Сообщение",
        placeholderName: "Иван Иванов",
        placeholderMessage: "Чем мы можем помочь?",
        sending: "Отправка...",
        send: "Отправить сообщение",
      };
    }
    if (language === "uz") {
      return {
        title: "Biz bilan bog'laning",
        subtitle:
          "Yangilik yubormoqchimisiz, tadbir haqida savolingiz bormi yoki media jamoamizga qo'shilmoqchimisiz? Sizdan xabar kutamiz.",
        contactInfo: "Aloqa ma'lumotlari",
        emailUs: "Email yozing",
        callUs: "Qo'ng'iroq qiling",
        visitUs: "Tashrif buyuring",
        submissions: "Talabalar yuborishlari",
        submissionsText:
          "Biz maqolalar, foto-hikoyalar va tadbir yoritish takliflarini qabul qilamiz. Mavzuda " + '"Submission"' + " so'zini kiriting.",
        yourName: "Ismingiz",
        email: "Email manzil",
        subject: "Mavzu",
        message: "Xabar",
        placeholderName: "Ali Valiyev",
        placeholderMessage: "Qanday yordam bera olamiz?",
        sending: "Yuborilmoqda...",
        send: "Xabar yuborish",
      };
    }
    return {
      title: "Get in Touch",
      subtitle:
        "Have a story to share, a question about an event, or want to join our media team? We'd love to hear from you.",
      contactInfo: "Contact Info",
      emailUs: "Email Us",
      callUs: "Call Us",
      visitUs: "Visit Us",
      submissions: "Student Submissions",
      submissionsText:
        "We accept Op-Eds, photo essays, and event coverage proposals. Please include \"Submission\" in your subject line.",
      yourName: "Your Name",
      email: "Email Address",
      subject: "Subject",
      message: "Message",
      placeholderName: "John Doe",
      placeholderMessage: "How can we help you?",
      sending: "Sending...",
      send: "Send Message",
    };
  }, [language]);

  const mapSubjectToLabel = (subjectValue: string) => {
    const option = SUBJECT_OPTIONS.find((opt) => opt.value === subjectValue) || SUBJECT_OPTIONS[0];
    if (language === "ru") return option.ru;
    if (language === "uz") return option.uz;
    return option.en;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addMessage({
        ...formData,
        subject: mapSubjectToLabel(formData.subject),
      });
      setFormData({ name: "", email: "", subject: "general", message: "" });
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
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4">{t.title}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t.subtitle}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4 space-y-8">
            <div className="p-8 rounded-2xl bg-primary text-primary-foreground shadow-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">{t.contactInfo}</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{t.emailUs}</p>
                    <p className="text-sm text-primary-foreground/80">media@university.edu</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{t.callUs}</p>
                    <p className="text-sm text-primary-foreground/80">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{t.visitUs}</p>
                    <p className="text-sm text-primary-foreground/80">Student Center, Room 402<br />Main Campus</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl border border-border/40 bg-card">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> {t.submissions}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.submissionsText}</p>
            </div>
          </div>

          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="p-8 md:p-12 rounded-2xl border border-border/40 bg-card shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.yourName}</label>
                  <input
                    required
                    type="text"
                    placeholder={t.placeholderName}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.email}</label>
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
                <label className="text-sm font-medium">{t.subject}</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                >
                  {SUBJECT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {language === "ru" ? option.ru : language === "uz" ? option.uz : option.en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.message}</label>
                <textarea
                  required
                  placeholder={t.placeholderMessage}
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
                {isSubmitting ? t.sending : t.send}
                <Send className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
