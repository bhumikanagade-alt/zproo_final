import React, { useState } from "react";
import "./FAQSection.css";

interface FAQ {
  question: string;
  answer: string;
}

const faqData: Record<string, FAQ[]> = {
  General: [
    {
      question: "Can I track the location of my booked bus online?",
      answer:
        "Yes, you can track your bus online using the Track My Bus feature on ZPROO Bus. This feature allows passengers and their families to track the live location of the bus. You can follow your bus on a map and use the information to plan your trip to the boarding point and get off at the correct stop. Family and friends can also check the bus location to schedule pickups and ensure safety.",
    },
    {
      question:
        "What are the advantages of booking bus tickets with ZPROO Bus?",
      answer:
        "There are many advantages to booking bus tickets online with ZPROO Bus. You can search and book private and government-operated buses, compare different bus options, select your preferred seats, and choose convenient boarding and dropping points. You can also filter buses based on departure time, bus type, fare, amenities, and other available options.",
    },
    {
      question: "Why should I book bus tickets online with ZPROO Bus?",
      answer:
        "Booking bus tickets online with ZPROO Bus makes travel planning simple and convenient. You can book your ticket from anywhere without waiting in long queues at bus stations or travel counters. You can compare different bus schedules, operators, fares, seat availability, and amenities before making your booking.\n\nOnline booking also allows you to select your preferred seat and receive booking and travel updates. You can view available buses in real time and plan your journey more conveniently.",
    },
    {
      question:
        "Do I need to create an account on ZPROO Bus to book a bus ticket?",
      answer:
        "Depending on the booking process, you may be able to book a bus ticket without creating an account. However, creating a ZPROO Bus account can make future bookings faster and give you convenient access to your bookings, tickets, offers, and travel information.",
    },
    {
      question: "Does online bus booking cost more?",
      answer:
        "No. The ticket fare displayed on ZPROO Bus is based on the fare provided by the respective bus operator. Additional charges, if applicable, will be clearly displayed during the booking process before payment.",
    },
    {
      question: "How can I get discounts on bus bookings?",
      answer:
        "You can check the available offers and promotional discounts on ZPROO Bus before completing your booking. If a coupon code is applicable, enter the coupon code during checkout to receive the eligible discount.",
    },
    {
      question:
        "What features are available for bus booking on ZPROO Bus?",
      answer:
        "ZPROO Bus provides features designed to make bus travel easier and more convenient. Depending on the bus and operator, you may be able to compare buses, select seats, view boarding and dropping points, check bus amenities, track your bus, and access booking and travel information.",
    },
    {
      question: "Can I book a government bus ticket on ZPROO Bus?",
      answer:
        "Yes, government-operated bus services may be available on ZPROO Bus depending on the routes and transport operators supported by the platform. Availability can vary by city, route, travel date, and operator.",
    },
  ],

  "Ticket-related": [
    {
      question: "How can I book bus tickets on ZPROO Bus?",
      answer:
        "Booking a bus ticket on ZPROO Bus is simple. Enter your source city in the From field and your destination city in the To field. Select your travel date and click the Search button.\n\nYou will see the available buses for your selected route and date. You can use available filters such as departure time, arrival time, bus type, fare, duration, amenities, and other options to find a suitable bus. Select your preferred bus and seat, enter the required passenger details, and complete the payment.",
    },
    {
      question:
        "Can I change the date of my journey after booking a bus ticket?",
      answer:
        "Yes, you may be able to change your journey date after booking if the selected bus operator supports rescheduling. Availability and rescheduling charges may vary depending on the operator and ticket conditions.\n\nIf rescheduling is available, you can use the Reschedule option associated with your booking and select an eligible new travel date.",
    },
    {
      question: "Is it mandatory to take a printout of the ticket?",
      answer:
        "It depends on the bus operator and the ticket requirements. If a digital ticket or m-ticket is accepted, you can show the ticket on your mobile device while boarding.\n\nSome operators may require a printed ticket or additional travel documents. Please check the boarding instructions provided with your booking.",
    },
    {
      question: "I've lost my ticket. What should I do?",
      answer:
        "If you have lost your ticket, you can check your registered email, SMS, or your ZPROO Bus account for the booking details.\n\nIf you cannot find your ticket, contact ZPROO Bus customer support with the required booking information so that your ticket details can be retrieved.",
    },
    {
      question: "What is an m-Ticket?",
      answer:
        "An m-ticket is a digital ticket or booking confirmation that can be displayed on your mobile device while boarding, when supported by the bus operator.\n\nThe m-ticket may contain important booking information such as the ticket number, PNR number, passenger details, journey details, and boarding information.",
    },
    {
      question: "I didn't receive my m-ticket. Can it be resent?",
      answer:
        "If you did not receive your m-ticket or booking confirmation, first check your SMS, email, spam folder, and ZPROO Bus account.\n\nIf the ticket is still unavailable, contact ZPROO Bus customer support with your booking details so the ticket information can be retrieved or resent, subject to availability.",
    },
    {
      question:
        "I entered the wrong mobile number while booking. Can I receive my ticket on a different number?",
      answer:
        "If you entered an incorrect mobile number during booking, contact ZPROO Bus customer support as soon as possible. After verifying your booking details, the support team can assist you according to the applicable booking and security policies.",
    },
  ],

  Payment: [
    {
      question:
        "Is it safe to use my credit or debit card to book bus tickets on ZPROO Bus?",
      answer:
        "ZPROO Bus uses secure payment mechanisms to protect your payment information during the booking process. Payment information is processed through secure payment systems and should not be shared with anyone.\n\nAlways verify that you are using the official ZPROO Bus website or application before entering your payment information.",
    },
    {
      question:
        "Does the owner of the credit or debit card need to be one of the passengers?",
      answer:
        "No. The person making the payment does not necessarily have to be one of the passengers.\n\nHowever, the passenger whose name appears on the ticket should carry the required valid identification document while boarding, according to the operator's requirements.",
    },
    {
      question:
        "What payment options are available for bus ticket booking?",
      answer:
        "Depending on availability, ZPROO Bus may support multiple payment methods, such as:\n\n- Credit cards\n- Debit cards\n- UPI\n- Net Banking\n- Digital wallets\n- Other supported online payment methods\n\nThe payment methods available to you will be displayed during the checkout process.",
    },
  ],

  "Cancellation & Refund": [
    {
      question: "Can I cancel my bus ticket online?",
      answer:
        "Yes, eligible bus tickets can generally be cancelled online through the booking or cancellation section of ZPROO Bus.\n\nHowever, cancellation availability, cancellation charges, and the applicable cancellation period may vary depending on the bus operator and ticket conditions.",
    },
    {
      question: "How can I cancel a bus ticket online?",
      answer:
        "To cancel your bus ticket:\n\n1. Open the My Bookings or Cancellation section on ZPROO Bus.\n2. Select the booking you want to cancel.\n3. Verify your booking details.\n4. Select the Cancel Ticket option.\n5. Review the applicable cancellation charges and refund amount.\n6. Confirm the cancellation.\n\nThe refund will be processed according to the applicable cancellation policy.",
    },
    {
      question: "I missed the bus. Do I get a refund?",
      answer:
        "Refund eligibility depends on the reason for missing the bus and the applicable operator and booking policy.\n\nIf the bus was missed due to an issue caused by the bus operator or ZPROO Bus, you may be eligible for assistance or a refund according to the applicable policy.\n\nIf the bus was missed due to the passenger arriving late or another passenger-related reason, a refund may not be available.",
    },
    {
      question:
        "How can I get a refund if I cancel my bus ticket?",
      answer:
        "The refund amount depends on the cancellation policy of the respective bus operator and the time at which the ticket is cancelled.\n\nAfter cancellation, the eligible refund may be credited back to the original payment method or another supported refund method. The applicable refund amount and charges will be displayed during the cancellation process.",
    },
    {
      question:
        "What happens if the bus does not leave on time or is cancelled?",
      answer:
        "If the bus is delayed, cancelled, or does not operate as scheduled, ZPROO Bus will provide assistance based on the information received from the bus operator.\n\nDepending on the situation, you may be eligible for rescheduling, an alternative travel option, or a refund according to the applicable operator policy.\n\nIf you need assistance, contact ZPROO Bus customer support with your booking details.",
    },
    {
      question: "How can I reschedule my bus ticket?",
      answer:
        "If your ticket is eligible for rescheduling, you can reschedule it through the My Bookings section on ZPROO Bus.\n\nThe general process is:\n\n1. Open your booking in My Bookings.\n2. Select the Reschedule option.\n3. Choose an available new travel date.\n4. Select an eligible bus or journey option.\n5. Review the updated fare and any applicable rescheduling charges.\n6. Complete the payment, if required.\n7. Confirm the rescheduled booking.\n\nRescheduling availability, charges, and eligible dates depend on the bus operator's policy.",
    },
  ],
};

const FAQSection: React.FC = () => {
  const categories = Object.keys(faqData);

  const [activeCategory, setActiveCategory] = useState<string>(
    categories[0]
  );

  // All questions are closed when the page loads
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);

    // Keep all questions closed after changing category
    setOpenFAQ(null);
  };

  const toggleFAQ = (index: number) => {
    setOpenFAQ((currentOpenFAQ) =>
      currentOpenFAQ === index ? null : index
    );
  };

  return (
    <section className="faq-section">
      <div className="faq-container">

        {/* Section heading */}
        <div className="faq-heading">
          <h2>Frequently Asked Questions</h2>
        </div>

        {/* FAQ category bar */}
        <div className="faq-category-wrapper">
          <div className="faq-category-bar">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`faq-category ${
                  activeCategory === category ? "active" : ""
                }`}
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ questions */}
        <div className="faq-list">
          {faqData[activeCategory].map((faq, index) => {
            const isOpen = openFAQ === index;

            return (
              <div
                className={`faq-item ${isOpen ? "open" : ""}`}
                key={faq.question}
              >
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>

                  <span
                    className={`faq-icon ${
                      isOpen ? "open" : ""
                    }`}
                    aria-hidden="true"
                  >
                    <span className="faq-chevron"></span>
                  </span>
                </button>

                {isOpen && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default FAQSection;