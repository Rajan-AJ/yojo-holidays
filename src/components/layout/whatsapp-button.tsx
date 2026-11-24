"use client";

/**
 * Floating WhatsApp button (most Indian travellers prefer WhatsApp to forms).
 * Pushes `whatsapp_click` to GTM so it can be counted as a conversion.
 */
export function WhatsAppButton({ number }: { number: string }) {
  const digits = number.replace(/\D/g, "");
  const text = encodeURIComponent("Hi Yojo Holidays, I'd like help planning a trip.");
  return (
    <a
      href={`https://wa.me/${digits}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        window.dataLayer = window.dataLayer ?? [];
        window.dataLayer.push({ event: "whatsapp_click", page_path: window.location.pathname });
      }}
      className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)] transition-transform hover:scale-105 focus-visible:outline-offset-4 sm:bottom-7 sm:right-7"
      aria-label="Chat with us on WhatsApp"
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7 fill-current">
        <path d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.4.7 4.7 1.9 6.7L3 29l6.9-2.1c1.9 1 4 1.6 6.1 1.6 7 0 12.7-5.6 12.7-12.6S23 3 16 3zm0 23.1c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.1 1.2 1.3-4-.3-.4c-1.1-1.7-1.7-3.6-1.7-5.6C5.4 9.8 10.2 5.1 16 5.1s10.6 4.7 10.6 10.5S21.8 26.1 16 26.1zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.6-1.8-1.7-2.1s0-.5.1-.6l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.1-1.2 2.8 1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 .8.4 1.4.6 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z" />
      </svg>
    </a>
  );
}
