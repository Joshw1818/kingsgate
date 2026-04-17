const quotes = [
  {
    body: "Since I have been using Housd, it has made it a pleasure. I send the requirements to them and they do all the hard work — therefore stress free for me.",
    name: "Operations Lead",
    context: "UK infrastructure contractor",
  },
  {
    body: "Our experience with Housd is beyond exceptional. They are extremely helpful, reliable, friendly, competitively priced and always available. Even the most difficult and rural places to find accommodation they always manage to source what is requested.",
    name: "Project Manager",
    context: "National construction group",
  },
];

export function Testimonials() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {quotes.map((q) => (
        <figure
          key={q.name}
          className="flex h-full flex-col justify-between rounded-xl bg-housd-cream p-8 ring-1 ring-housd-line"
        >
          <blockquote className="font-housd text-xl leading-relaxed text-housd-ink">
            “{q.body}”
          </blockquote>
          <figcaption className="mt-6 text-sm text-slate-600">
            <span className="font-semibold text-housd-ink">{q.name}</span>
            <span className="mx-2 text-slate-400">•</span>
            <span>{q.context}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
