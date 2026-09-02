/**
 * Template library (SPEC §6). Content is plain Tiptap JSON built from the
 * same node types the StarterKit schema knows, so applying a template can
 * never inject markup — it flows through the editor schema like any other
 * content.
 */

export interface NoteTemplate {
  id: string
  name: string
  category: "Writing" | "Business" | "Personal"
  description: string
  content: unknown
}

type Block = Record<string, unknown>

const text = (t: string): Block => ({ type: "text", text: t })
const paragraph = (...parts: Block[]): Block => ({
  type: "paragraph",
  content: parts,
})
const heading = (level: number, t: string): Block => ({
  type: "heading",
  attrs: { level },
  content: [text(t)],
})
const bulletItem = (t: string): Block => ({
  type: "listItem",
  content: [paragraph(text(t))],
})
const bulletList = (...items: Block[]): Block => ({
  type: "bulletList",
  content: items,
})
const orderedItem = (t: string): Block => bulletItem(t)
const orderedList = (...items: Block[]): Block => ({
  type: "orderedList",
  content: items,
})

const doc = (...content: Block[]): Block => ({ type: "doc", content })

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "blog-post",
    name: "Blog Post",
    category: "Writing",
    description: "Hook, body sections, and a call to action.",
    content: doc(
      heading(1, "Post title"),
      paragraph(text("Open with a hook: a question, a statistic, or a scene.")),
      heading(2, "Why this matters"),
      paragraph(text("Set up the problem and promise what the reader will learn.")),
      heading(2, "Main point"),
      bulletList(
        bulletItem("Supporting evidence"),
        bulletItem("Example or anecdote"),
        bulletItem("Counterpoint and response")
      ),
      heading(2, "Takeaways"),
      orderedList(orderedItem("Key insight one"), orderedItem("Key insight two")),
      paragraph(text("End with a clear call to action."))
    ),
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    category: "Business",
    description: "Agenda, decisions, and action items.",
    content: doc(
      heading(1, "Meeting — [date]"),
      paragraph(text("Attendees: ")),
      heading(2, "Agenda"),
      orderedList(orderedItem("Topic one"), orderedItem("Topic two")),
      heading(2, "Decisions"),
      bulletList(bulletItem("Decision one — rationale")),
      heading(2, "Action items"),
      bulletList(bulletItem("[owner] task — due date"))
    ),
  },
  {
    id: "project-brief",
    name: "Project Brief",
    category: "Business",
    description: "Goal, scope, milestones, and risks.",
    content: doc(
      heading(1, "Project brief"),
      heading(2, "Goal"),
      paragraph(text("One sentence: what does success look like?")),
      heading(2, "Scope"),
      bulletList(bulletItem("In scope"), bulletItem("Out of scope")),
      heading(2, "Milestones"),
      orderedList(
        orderedItem("Milestone one — date"),
        orderedItem("Milestone two — date")
      ),
      heading(2, "Risks"),
      bulletList(bulletItem("Risk — mitigation"))
    ),
  },
  {
    id: "essay",
    name: "Essay",
    category: "Writing",
    description: "Thesis, arguments, and conclusion.",
    content: doc(
      heading(1, "Essay title"),
      heading(2, "Introduction and thesis"),
      paragraph(text("State the thesis in one arguable sentence.")),
      heading(2, "Argument one"),
      paragraph(text("Claim, evidence, analysis.")),
      heading(2, "Argument two"),
      paragraph(text("Claim, evidence, analysis.")),
      heading(2, "Counterargument"),
      paragraph(text("The strongest objection, and your reply.")),
      heading(2, "Conclusion"),
      paragraph(text("Restate the thesis and its wider implication."))
    ),
  },
  {
    id: "resume",
    name: "Resume",
    category: "Personal",
    description: "Clean one-page structure.",
    content: doc(
      heading(1, "Your Name"),
      paragraph(text("City · email@example.com · linkedin.com/in/you")),
      heading(2, "Summary"),
      paragraph(text("Two lines: who you are and the value you bring.")),
      heading(2, "Experience"),
      heading(3, "Job title — Company (2022–now)"),
      bulletList(
        bulletItem("Achievement with a number"),
        bulletItem("Achievement with a number")
      ),
      heading(2, "Skills"),
      paragraph(text("Skill one, skill two, skill three"))
    ),
  },
  {
    id: "email",
    name: "Email",
    category: "Business",
    description: "Subject, context, ask, sign-off.",
    content: doc(
      heading(2, "Subject: [clear, specific subject]"),
      paragraph(text("Hi [name],")),
      paragraph(text("One line of context.")),
      paragraph(text("The specific ask, with the deadline.")),
      paragraph(text("Thanks,"))
    ),
  },
  {
    id: "daily-journal",
    name: "Daily Journal",
    category: "Personal",
    description: "Reflections, gratitude, and intentions.",
    content: doc(
      heading(1, "Daily journal"),
      heading(2, "Highlights"),
      bulletList(bulletItem("Moment worth remembering")),
      heading(2, "Gratitude"),
      bulletList(bulletItem("Something you are grateful for")),
      heading(2, "Tomorrow"),
      bulletList(bulletItem("One thing to move forward"))
    ),
  },
  {
    id: "todo",
    name: "To-do List",
    category: "Personal",
    description: "Simple prioritized checklist.",
    content: doc(
      heading(1, "To-do"),
      heading(2, "Today"),
      bulletList(bulletItem("[ ] Task"), bulletItem("[ ] Task")),
      heading(2, "Later"),
      bulletList(bulletItem("[ ] Task"))
    ),
  },
]

export const TEMPLATE_CATEGORIES = ["Writing", "Business", "Personal"] as const
