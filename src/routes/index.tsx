import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileSearch, Quote, Check, X } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VoiceCheck — Protect participant voice in evaluation reports" },
      { name: "description", content: "Catch moments where participant voices have been paraphrased into academic language — before your findings are finalized." },
      { property: "og:title", content: "VoiceCheck" },
      { property: "og:description", content: "Catch paraphrased participant voices before your findings are finalized." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 md:px-10 py-5 flex items-center justify-between border-b border-border">
        <Link to="/" className="font-display text-xl tracking-tight">VoiceCheck</Link>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/auth"><Button size="sm">Get started</Button></Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-6 md:px-10 py-20 md:py-32 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-flag-bg border border-flag-border text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-flag" />
            For public health evaluators
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-6">
            Protect the words<br />participants <em className="italic text-flag">actually</em> said.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            VoiceCheck reads your evaluation drafts and flags the moments where lived experience got flattened into clinical findings — so you can restore the original voice before publication.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/auth"><Button size="lg" className="h-12 px-6">Try VoiceCheck free</Button></Link>
          </div>
        </section>

        <section className="px-6 md:px-10 py-16 border-t border-border bg-card">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-10">
            {[
              { icon: FileSearch, title: "Upload a draft", body: "Drop in a .txt, .docx, or .pdf evaluation report — up to 120k characters." },
              { icon: Quote, title: "Review flags one by one", body: "See where first-person, emotion, and specifics were paraphrased away. Each flag includes a plain-language explanation." },
              { icon: CheckCircle2, title: "Export a revision report", body: "Accept or dismiss flags, then export a PDF you can use to revise the draft." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="w-10 h-10 rounded-md bg-flag-bg border border-flag-border flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 md:px-10 py-20 border-t border-border bg-card">
          <div className="max-w-5xl mx-auto">
            <div className="max-w-2xl mb-10">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Sample flag</div>
              <h2 className="font-display text-3xl md:text-4xl mb-4">What a flag looks like</h2>
              <p className="text-muted-foreground leading-relaxed">
                Here's an excerpt from a maternal health evaluation. VoiceCheck highlighted one passage in the draft and surfaced the original transcript next to it.
              </p>
            </div>

            <div className="grid md:grid-cols-5 gap-5 items-stretch">
              <div className="md:col-span-3 rounded-lg border border-border bg-background p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Draft report — page 14</div>
                  <div className="text-xs text-muted-foreground">1 of 1 flag</div>
                </div>
                <div className="font-display text-[17px] md:text-[18px] leading-[1.7] text-foreground space-y-4">
                  <p>
                    Across the three focus groups, participants identified transportation, wait times, and provider communication as the dominant barriers to prenatal care.
                  </p>
                  <p>
                    <span className="bg-flag-bg border-b-2 border-flag-border px-1 rounded-sm cursor-pointer">
                      Several participants expressed dissatisfaction with the intake process and reported feeling that staff were unresponsive to their concerns.
                    </span>{" "}
                    These findings align with prior literature on patient-centered care in Federally Qualified Health Centers.
                  </p>
                </div>
              </div>

              <aside className="md:col-span-2 rounded-lg border border-flag-border bg-flag-bg/40 p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-flag" />
                  <span className="text-xs uppercase tracking-widest text-foreground/80">Flag · Emotion flattened</span>
                </div>

                <div className="mb-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Draft wrote</div>
                  <p className="text-sm leading-relaxed italic text-muted-foreground">
                    "Several participants expressed dissatisfaction with the intake process and reported feeling that staff were unresponsive to their concerns."
                  </p>
                </div>

                <div className="mb-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Participant actually said</div>
                  <p className="text-sm leading-relaxed text-foreground">
                    "I sat there for two hours holding my paperwork. Nobody even looked at me. I started crying in the waiting room and the lady at the front desk acted like I wasn't there."
                  </p>
                </div>

                <div className="text-xs text-muted-foreground leading-relaxed mb-5 pb-5 border-b border-flag-border/60">
                  <span className="font-medium text-foreground">Why this is flagged:</span> the draft removes the two-hour wait, the tears, and the specific interaction with the front-desk staff — collapsing a vivid moment into "expressed dissatisfaction."
                </div>

                <div className="flex gap-2 mt-auto">
                  <Button size="sm" className="flex-1 gap-1.5" disabled>
                    <Check className="w-3.5 h-3.5" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" disabled>
                    <X className="w-3.5 h-3.5" /> Dismiss
                  </Button>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="px-6 md:px-10 py-20 border-t border-border">
          <div className="max-w-5xl mx-auto">
            <div className="max-w-2xl mb-12">
              <h2 className="font-display text-3xl md:text-4xl mb-4">Every pattern VoiceCheck detects</h2>
              <p className="text-muted-foreground leading-relaxed">
                Six patterns of paraphrasing that quietly strip participant voice out of evaluation reports. Each card shows a real-world before and after — the <span className="bg-flag-bg border-b border-flag-border px-1">amber</span> is what VoiceCheck would flag.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {[
                {
                  title: "First-person shifted to third-person",
                  body: "The participant's own voice is rewritten as a researcher observation.",
                  before: "I felt like nobody was listening to me at the clinic.",
                  after: "Participants reported feeling unheard by clinic staff.",
                },
                {
                  title: "Hesitation or qualification removed",
                  body: "Pauses, uncertainty, and hedges are smoothed into declarative claims.",
                  before: "I mean, I guess sometimes the nurse was nice, but… I don't know.",
                  after: "The nurse was perceived positively by the participant.",
                },
                {
                  title: "Informal or emotional language clinicalized",
                  body: "Everyday words get swapped for diagnostic or program vocabulary.",
                  before: "It was a nightmare trying to get my kid's meds refilled.",
                  after: "The caregiver experienced barriers to medication access.",
                },
                {
                  title: "Concrete details replaced with generalizations",
                  body: "Specific names, numbers, and places are blurred into abstractions.",
                  before: "I took three buses to the Eastside clinic and waited four hours.",
                  after: "Transportation and wait times were identified as barriers.",
                },
                {
                  title: "Emotion or fear flattened",
                  body: "Strong feeling is rewritten as neutral, professional framing.",
                  before: "I was terrified they would take my baby away.",
                  after: "The participant expressed concerns about child welfare involvement.",
                },
                {
                  title: "Culturally specific phrasing standardized",
                  body: "Community-specific language is replaced with clinical equivalents.",
                  before: "My abuela said it was susto — that's why I couldn't sleep.",
                  after: "The participant attributed insomnia to a culture-bound syndrome.",
                },
              ].map(({ title, body, before, after }) => (
                <div key={title} className="rounded-lg border border-border bg-card p-6">
                  <h3 className="font-display text-lg mb-1.5">{title}</h3>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{body}</p>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Participant said</div>
                      <p className="leading-relaxed">
                        <span className="bg-flag-bg border-b border-flag-border px-1 py-0.5 rounded-sm">{before}</span>
                      </p>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Draft report wrote</div>
                      <p className="leading-relaxed text-muted-foreground italic">{after}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 md:px-10 py-10 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-muted-foreground">
          <p className="max-w-xl leading-relaxed">
            Built for public health evaluators working with low-literacy and non-English speaking populations.
          </p>
          <p className="text-xs">
            Analysis powered by the Claude API.
          </p>
        </div>
      </footer>
    </div>
  );
}
