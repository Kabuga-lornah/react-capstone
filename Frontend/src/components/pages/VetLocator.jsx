import React from "react";

const clinics = [
  {
    id: 1,
    name: "Harbor Pet Clinic",
    specialty: "General care • Vaccinations",
    distance: "0.8 mi away",
    address: "24 Bayview Blvd, Downtown",
    hours: "Open until 7:00 PM",
    phone: "(415) 555-0148",
  },
  {
    id: 2,
    name: "Oak & Paw Veterinary",
    specialty: "Wellness • Surgery",
    distance: "1.4 mi away",
    address: "9 Maple Street, Midtown",
    hours: "Open until 6:30 PM",
    phone: "(415) 555-0184",
  },
  {
    id: 3,
    name: "Sunset Animal Care",
    specialty: "Urgent care • Preventive care",
    distance: "2.2 mi away",
    address: "118 Sunset Ave, West End",
    hours: "Open until 8:00 PM",
    phone: "(415) 555-0127",
  },
];

const VetLocator = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-orange-600 font-semibold mb-2">
          Veterinary Care
        </p>
        <h1 className="text-3xl md:text-5xl font-black text-orange-700 leading-tight">
          Nearby clinics for your new companion
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {clinics.map((clinic) => (
          <div
            key={clinic.id}
            className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
                🩺
              </div>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                {clinic.distance}
              </span>
            </div>

            <h2 className="text-xl font-bold text-[#2d1a05]">{clinic.name}</h2>
            <p className="mt-2 text-sm text-orange-700 font-medium">{clinic.specialty}</p>

            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>📍 {clinic.address}</p>
              <p>🕒 {clinic.hours}</p>
              <p>📞 {clinic.phone}</p>
            </div>

            <div className="mt-5 flex gap-3">
              <button className="flex-1 rounded-full bg-orange-500 px-4 py-2.5 font-semibold text-white hover:bg-orange-600">
                Call
              </button>
              <button className="flex-1 rounded-full border border-orange-200 bg-orange-50 px-4 py-2.5 font-semibold text-orange-700 hover:bg-orange-100">
                Map
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-[1.75rem] border border-dashed border-orange-200 bg-orange-50/70 p-5 text-sm text-gray-700">
        <p className="font-semibold text-orange-700">Care reminder</p>
        <p className="mt-2 leading-6">
          Before adoption, confirm vaccination history, deworming status, medical notes, and the clinic your future pet already visits when possible.
        </p>
      </div>
    </div>
  );
};

export default VetLocator;
