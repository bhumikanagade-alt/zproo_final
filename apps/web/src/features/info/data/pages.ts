export type Section =
  | { t: "cards"; title: string; items: { icon: string; title: string; text: string }[] }
  | { t: "steps"; title: string; items: { title: string; text: string }[] }
  | { t: "table"; title: string; head: string[]; rows: string[][] }
  | { t: "checks"; title: string; items: string[] }
  | { t: "note"; title: string; text: string }
  | { t: "faq"; title: string; items: { q: string; a: string }[] };

export interface PageData {
  slug: string;
  group: string;
  icon: string;
  title: string;
  tagline: string;
  stats: [string, string][];
  sections: Section[];
}

const cards = (title: string, items: [string, string, string][]): Section => ({
  t: "cards", title, items: items.map(([icon, title, text]) => ({ icon, title, text })),
});
const steps = (title: string, items: [string, string][]): Section => ({
  t: "steps", title, items: items.map(([title, text]) => ({ title, text })),
});
const table = (title: string, head: string[], rows: string[][]): Section => ({ t: "table", title, head, rows });
const checks = (title: string, items: string[]): Section => ({ t: "checks", title, items });
const note = (title: string, text: string): Section => ({ t: "note", title, text });
const faq = (title: string, items: [string, string][]): Section => ({
  t: "faq", title, items: items.map(([q, a]) => ({ q, a })),
});

export const PAGES: PageData[] = [
  {
    slug: "pnr-status", group: "Book", icon: "🎫",
    title: "PNR status, made clear",
    tagline: "Know exactly where your railway ticket stands: confirmed, RAC or waitlisted.",
    stats: [["10", "Digit PNR"], ["Instant", "Updates"], ["Free", "To check"]],
    sections: [
      steps("Check in three steps", [
        ["Find your PNR", "The 10-digit number on your ticket, SMS or email."],
        ["Enter it", "Type it into the PNR checker."],
        ["Read the result", "See status, class and passenger details."],
      ]),
      table("Understanding status codes", ["Code", "Meaning"], [
        ["CNF", "Confirmed, berth or seat allotted"],
        ["RAC", "Reservation Against Cancellation: you can board and share a berth"],
        ["WL", "Waitlisted, confirmation depends on cancellations"],
        ["RLWL", "Remote location waitlist"],
        ["CAN", "Cancelled"],
      ]),
      checks("Good habits", ["Check again after chart preparation", "Keep your PNR saved offline", "Carry ID matching passenger names", "Cancel early if you will not travel"]),
      faq("PNR FAQs", [
        ["Where do I find my PNR?", "On your e-ticket, SMS or booking confirmation email."],
        ["Will a waitlisted ticket confirm?", "It may, if others cancel. Track it until chart preparation."],
      ]),
    ],
  },
  {
    slug: "live-train-status", group: "Book", icon: "📡",
    title: "Track your train, live",
    tagline: "See where your train is, how late or early it runs and which station is next.",
    stats: [["Live", "Location"], ["Next", "Station ETA"], ["Less", "Waiting"]],
    sections: [
      cards("What you can see", [
        ["📍", "Current position", "Last crossed station and the next stop."],
        ["⏱️", "Delay info", "How far ahead or behind schedule the train is."],
        ["🚉", "Arrival planning", "Time your station arrival with confidence."],
      ]),
      steps("Track a train", [
        ["Enter train", "Search by train number or name."],
        ["Choose start date", "Pick the day the train began its journey."],
        ["Follow along", "Watch progress toward your station."],
      ]),
      note("Good to know", "Running status is an estimate. Timings can shift because of traffic, signals and halts, so keep an eye on updates as your train nears the station."),
      checks("Picking someone up?", ["Share the estimated arrival time", "Check the platform on arrival", "Allow extra time for late trains", "Keep a contact number ready"]),
      faq("Live status FAQs", [
        ["Why did the ETA change?", "Running time varies along the route."],
        ["Is it updated continuously?", "It refreshes as new station data becomes available."],
      ]),
    ],
  },
  {
    slug: "cancel-booking", group: "Help", icon: "🚫",
    title: "Cancel a booking, easily",
    tagline: "Plans change. Cancel in a few steps and see what you will get back.",
    stats: [["4", "Simple steps"], ["Clear", "Refund info"], ["Any", "Time"]],
    sections: [
      steps("How to cancel", [
        ["Open your booking", "Find the ticket in your bookings."],
        ["Review charges", "Check the cancellation fee and refund."],
        ["Confirm", "Confirm the cancellation."],
        ["Save the reference", "Keep the confirmation for follow-ups."],
      ]),
      table("What affects your refund", ["Factor", "Effect"], [
        ["Time before departure", "Earlier cancellation usually means a higher refund"],
        ["Operator policy", "Each operator sets its own charges"],
        ["Ticket type", "Bus, train and hotel rules differ"],
      ]),
      checks("Before you cancel", ["Read the cancellation policy", "Check refund amount first", "Cancel passengers individually if allowed", "Keep your booking ID"]),
      note("Heads up", "Refund amounts depend on the operator's policy at the time of cancellation. The exact amount is shown before you confirm."),
      faq("Cancellation FAQs", [
        ["Will I get a full refund?", "It depends on the policy and timing."],
        ["Can I undo a cancellation?", "No. You would need to make a new booking."],
      ]),
    ],
  },
  {
    slug: "refund-status", group: "Help", icon: "💸",
    title: "Track your refund",
    tagline: "See where your money is and when to expect it, without chasing anyone.",
    stats: [["Track", "Each step"], ["Same", "Source"], ["Clear", "Timelines"]],
    sections: [
      steps("Refund journey", [
        ["Cancellation confirmed", "The refund process starts."],
        ["Refund initiated", "We send the amount to your payment provider."],
        ["Bank processing", "Your bank or wallet handles the credit."],
        ["Credited", "The amount appears in your account."],
      ]),
      table("Typical waiting time", ["Payment method", "What to expect"], [
        ["Card", "Usually a few working days"],
        ["UPI", "Often quicker, depends on your bank"],
        ["Net banking", "Usually a few working days"],
        ["Wallet", "Often credited faster"],
      ]),
      cards("If it is late", [
        ["📧", "Email us", "Send booking ID and payment reference."],
        ["🏦", "Ask your bank", "Banks can trace incoming credits."],
      ]),
      faq("Refund FAQs", [
        ["Where does the money go?", "Back to the original payment method."],
        ["Why less than I paid?", "Cancellation charges may apply."],
      ]),
    ],
  },
  {
    slug: "faqs", group: "Help", icon: "💡",
    title: "Frequently asked questions",
    tagline: "Quick answers to the things travellers ask most.",
    stats: [["Quick", "Answers"], ["Simple", "Words"], ["Always", "Growing"]],
    sections: [
      cards("Browse by topic", [
        ["🎟️", "Booking", "Tickets, passengers and changes."],
        ["💳", "Payments", "Methods, failures and receipts."],
        ["↩️", "Cancellations", "Charges and refunds."],
        ["👤", "Account", "Profile and saved travellers."],
      ]),
      faq("General", [
        ["Can I track the location of my booked bus online?", "Yes, you can track your bus online using the Track My Bus feature on ZPROO Bus. This feature allows passengers and their families to track the live location of the bus. You can follow your bus on a map and use the information to plan your trip to the boarding point and get off at the correct stop. Family and friends can also check the bus location to schedule pickups and ensure safety."],
        ["What are the advantages of booking bus tickets with ZPROO Bus?", "There are many advantages to booking bus tickets online with ZPROO Bus. You can search and book private and government-operated buses, compare different bus options, select your preferred seats, and choose convenient boarding and dropping points. You can also filter buses based on departure time, bus type, fare, amenities, and other available options."],
        ["Why should I book bus tickets online with ZPROO Bus?", "Booking bus tickets online with ZPROO Bus makes travel planning simple and convenient. You can book your ticket from anywhere without waiting in long queues at bus stations or travel counters. You can compare different bus schedules, operators, fares, seat availability, and amenities before making your booking.\n\nOnline booking also allows you to select your preferred seat and receive booking and travel updates. You can view available buses in real time and plan your journey more conveniently."],
        ["Do I need to create an account on ZPROO Bus to book a bus ticket?", "Depending on the booking process, you may be able to book a bus ticket without creating an account. However, creating a ZPROO Bus account can make future bookings faster and give you convenient access to your bookings, tickets, offers, and travel information."],
        ["Does online bus booking cost more?", "No. The ticket fare displayed on ZPROO Bus is based on the fare provided by the respective bus operator. Additional charges, if applicable, will be clearly displayed during the booking process before payment."],
        ["How can I get discounts on bus bookings?", "You can check the available offers and promotional discounts on ZPROO Bus before completing your booking. If a coupon code is applicable, enter the coupon code during checkout to receive the eligible discount."],
        ["What features are available for bus booking on ZPROO Bus?", "ZPROO Bus provides features designed to make bus travel easier and more convenient. Depending on the bus and operator, you may be able to compare buses, select seats, view boarding and dropping points, check bus amenities, track your bus, and access booking and travel information."],
        ["Can I book a government bus ticket on ZPROO Bus?", "Yes, government-operated bus services may be available on ZPROO Bus depending on the routes and transport operators supported by the platform. Availability can vary by city, route, travel date, and operator."],
      ]),
      faq("Ticket-related", [
        ["How can I book bus tickets on ZPROO Bus?", "Booking a bus ticket on ZPROO Bus is simple. Enter your source city in the From field and your destination city in the To field. Select your travel date and click the Search button.\n\nYou will see the available buses for your selected route and date. You can use available filters such as departure time, arrival time, bus type, fare, duration, amenities, and other options to find a suitable bus. Select your preferred bus and seat, enter the required passenger details, and complete the payment."],
        ["Can I change the date of my journey after booking a bus ticket?", "Yes, you may be able to change your journey date after booking if the selected bus operator supports rescheduling. Availability and rescheduling charges may vary depending on the operator and ticket conditions.\n\nIf rescheduling is available, you can use the Reschedule option associated with your booking and select an eligible new travel date."],
        ["Is it mandatory to take a printout of the ticket?", "It depends on the bus operator and the ticket requirements. If a digital ticket or m-ticket is accepted, you can show the ticket on your mobile device while boarding.\n\nSome operators may require a printed ticket or additional travel documents. Please check the boarding instructions provided with your booking."],
        ["I've lost my ticket. What should I do?", "If you have lost your ticket, you can check your registered email, SMS, or your ZPROO Bus account for the booking details.\n\nIf you cannot find your ticket, contact ZPROO Bus customer support with the required booking information so that your ticket details can be retrieved."],
        ["What is an m-Ticket?", "An m-ticket is a digital ticket or booking confirmation that can be displayed on your mobile device while boarding, when supported by the bus operator.\n\nThe m-ticket may contain important booking information such as the ticket number, PNR number, passenger details, journey details, and boarding information."],
        ["I didn't receive my m-ticket. Can it be resent?", "If you did not receive your m-ticket or booking confirmation, first check your SMS, email, spam folder, and ZPROO Bus account.\n\nIf the ticket is still unavailable, contact ZPROO Bus customer support with your booking details so the ticket information can be retrieved or resent, subject to availability."],
        ["I entered the wrong mobile number while booking. Can I receive my ticket on a different number?", "If you entered an incorrect mobile number during booking, contact ZPROO Bus customer support as soon as possible. After verifying your booking details, the support team can assist you according to the applicable booking and security policies."],
      ]),
      faq("Payment", [
        ["Is it safe to use my credit or debit card to book bus tickets on ZPROO Bus?", "ZPROO Bus uses secure payment mechanisms to protect your payment information during the booking process. Payment information is processed through secure payment systems and should not be shared with anyone.\n\nAlways verify that you are using the official ZPROO Bus website or application before entering your payment information."],
        ["Does the owner of the credit or debit card need to be one of the passengers?", "No. The person making the payment does not necessarily have to be one of the passengers.\n\nHowever, the passenger whose name appears on the ticket should carry the required valid identification document while boarding, according to the operator's requirements."],
        ["What payment options are available for bus ticket booking?", "Depending on availability, ZPROO Bus may support multiple payment methods, such as:\n\n- Credit cards\n- Debit cards\n- UPI\n- Net Banking\n- Digital wallets\n- Other supported online payment methods\n\nThe payment methods available to you will be displayed during the checkout process."],
      ]),
      faq("Cancellation & Refund", [
        ["Can I cancel my bus ticket online?", "Yes, eligible bus tickets can generally be cancelled online through the booking or cancellation section of ZPROO Bus.\n\nHowever, cancellation availability, cancellation charges, and the applicable cancellation period may vary depending on the bus operator and ticket conditions."],
        ["How can I cancel a bus ticket online?", "To cancel your bus ticket:\n\n1. Open the My Bookings or Cancellation section on ZPROO Bus.\n2. Select the booking you want to cancel.\n3. Verify your booking details.\n4. Select the Cancel Ticket option.\n5. Review the applicable cancellation charges and refund amount.\n6. Confirm the cancellation.\n\nThe refund will be processed according to the applicable cancellation policy."],
        ["I missed the bus. Do I get a refund?", "Refund eligibility depends on the reason for missing the bus and the applicable operator and booking policy.\n\nIf the bus was missed due to an issue caused by the bus operator or ZPROO Bus, you may be eligible for assistance or a refund according to the applicable policy.\n\nIf the bus was missed due to the passenger arriving late or another passenger-related reason, a refund may not be available."],
        ["How can I get a refund if I cancel my bus ticket?", "The refund amount depends on the cancellation policy of the respective bus operator and the time at which the ticket is cancelled.\n\nAfter cancellation, the eligible refund may be credited back to the original payment method or another supported refund method. The applicable refund amount and charges will be displayed during the cancellation process."],
        ["What happens if the bus does not leave on time or is cancelled?", "If the bus is delayed, cancelled, or does not operate as scheduled, ZPROO Bus will provide assistance based on the information received from the bus operator.\n\nDepending on the situation, you may be eligible for rescheduling, an alternative travel option, or a refund according to the applicable operator policy.\n\nIf you need assistance, contact ZPROO Bus customer support with your booking details."],
        ["How can I reschedule my bus ticket?", "If your ticket is eligible for rescheduling, you can reschedule it through the My Bookings section on ZPROO Bus.\n\nThe general process is:\n\n1. Open your booking in My Bookings.\n2. Select the Reschedule option.\n3. Choose an available new travel date.\n4. Select an eligible bus or journey option.\n5. Review the updated fare and any applicable rescheduling charges.\n6. Complete the payment, if required.\n7. Confirm the rescheduled booking.\n\nRescheduling availability, charges, and eligible dates depend on the bus operator's policy."],
      ]),
    ],
  },
  {
    slug: "about", group: "Company", icon: "🚀",
    title: "About ZPROO",
    tagline: "Travel smarter. Go further. ZPROO GO is built to make every journey simpler.",
    stats: [["Smart", "Travel"], ["People", "First"], ["Future", "Ready"]],
    sections: [
      note("Who we are", "ZPROO GO is operated by zproo EV Pvt Ltd. We build tools that make booking and travelling easy, clear and stress-free."),
      cards("What we stand for", [
        ["🎯", "Clarity", "Honest pricing and straight answers."],
        ["⚡", "Speed", "Fast, simple booking experiences."],
        ["🤝", "Trust", "We take care of your journey and your data."],
        ["🌱", "Better movement", "Smarter, cleaner ways to travel."],
      ]),
      steps("How we work", [
        ["Listen", "Start with real traveller problems."],
        ["Build", "Design simple and reliable experiences."],
        ["Improve", "Let feedback shape what comes next."],
      ]),
      checks("Our promises", ["No hidden charges", "Clear cancellation terms", "Responsive support", "Respect for your privacy", "Continuous improvement"]),
    ],
  },
  {
    slug: "careers", group: "Company", icon: "🧑‍💻",
    title: "Build the future of travel with us",
    tagline: "Join zproo EV Pvt Ltd and help make every journey simpler.",
    stats: [["Bold", "Ideas"], ["Real", "Ownership"], ["Fast", "Growth"]],
    sections: [
      cards("Why join us", [
        ["🌟", "Meaningful work", "Build things travellers use every day."],
        ["📚", "Learning", "Grow with mentorship and new challenges."],
        ["🤗", "Great people", "A team that values honesty and kindness."],
        ["⚖️", "Balance", "We respect your time and wellbeing."],
      ]),
      table("Teams", ["Team", "What you will do"], [
        ["Engineering", "Build fast, reliable web and mobile experiences"],
        ["Product & Design", "Shape simple, beautiful journeys"],
        ["Operations", "Keep partners and bookings running smoothly"],
        ["Customer Support", "Help travellers when they need it most"],
      ]),
      steps("Hiring process", [
        ["Apply", "Email your resume to career@zproo.com."],
        ["Conversation", "Meet the team and share your work."],
        ["Decision", "We reply with clear next steps."],
      ]),
      checks("What we look for", ["Curiosity", "Ownership", "Clear communication", "Kindness"]),
    ],
  },
  {
    slug: "terms-privacy", group: "Company", icon: "🔒",
    title: "Terms & privacy",
    tagline: "Plain-language principles on how ZPROO GO works and how we handle your information.",
    stats: [["Clear", "Terms"], ["Careful", "With data"], ["Your", "Choice"]],
    sections: [
      note("Summary", "This page is a friendly summary. Replace it with your final legal Terms of Use and Privacy Policy before launch."),
      table("Data we use", ["Data", "Why"], [
        ["Name and contact", "To create bookings and reach you"],
        ["Travel details", "To issue tickets and reservations"],
        ["Payment reference", "To confirm payments and process refunds"],
      ]),
      cards("Your rights", [
        ["👁️", "Access", "Ask what information we hold."],
        ["✏️", "Correction", "Fix inaccurate details."],
        ["🗑️", "Deletion", "Request deletion where applicable."],
      ]),
      checks("Using ZPROO GO", ["Provide accurate details", "Use the service lawfully", "Keep your account secure", "Follow operator policies"]),
      faq("Privacy FAQs", [
        ["Who do I contact?", "Email career@zproo.com for any privacy question."],
      ]),
    ],
  },
];
