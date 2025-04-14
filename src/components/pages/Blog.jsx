import React from "react";

const testimonials = [
  {
    name: "Nia Thunderpaws",
    story: "Max came into my life like a furry whirlwind. Now my evenings are filled with tail wags and unconditional love.",
    image: "/testimonies/1.jpg"
  },
  {
    name: "Ben Barkwell",
    story: "Ever since Luna padded into my apartment, I haven't needed an alarm clock — just her 5AM meows.",
    image: "/testimonies/2.jpg"
  },
  {
    name: "Zara Purrington",
    story: "Who needs Netflix when you've got Felix chasing shadows across the room? Best decision ever.",
    image: "/testimonies/3.jpg"
  },
  {
    name: "Mika Tailspin",
    story: "Peanut the parrot whistles better than my ex. Zero regrets. Ten outta ten feathers.",
    image: "/testimonies/4.jpg"
  },
  {
    name: "Logan Woofster",
    story: "My mornings used to be bland. Now I get puppy kisses and an excuse to walk three times a day.",
    image: "/testimonies/5.jpg"
  },
  {
    name: "Daisy Whiskerbell",
    story: "Adopting Oliver was like downloading joy into my life. Even my cat-hating uncle loves him.",
    image: "/testimonies/6.jpg"
  },
  {
    name: "Theo Snuggleworth",
    story: "Churro is chaos on four paws, but man, I'd choose that chaos a million times over.",
    image: "/testimonies/7.jpg"
  },
  {
    name: "Ivy Cattitude",
    story: "Pickles taught me how to nap like a pro. He's my furry life coach.",
    image: "/testimonies/8.jpg"
  },
  {
    name: "Jay Fluffington",
    story: "Who knew a bunny named Marshmallow would melt my tough exterior? Adopting him was peak softness.",
    image: "/testimonies/9.jpg"
  },
  {
    name: "Rhea Barkbyte",
    story: "From chewed shoes to snuggles, Bella has made every chewed item worth it.",
    image: "/testimonies/10.jpg"
  }
];

const Blog = () => {
    return (
      <div className="min-h-screen bg-white py-10 px-6 font-sans">
        <h1 className="text-4xl font-bold text-center mb-12 text-[#FFA500] tracking-wide">Tails of Joy: Real Pet Adoption Stories</h1>
  
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative bg-white p-5 hover:scale-[1.02] transition-transform duration-300"
            >
              {/* Smaller corner elements */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#FFA500] rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#FFA500] rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#FFA500] rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#FFA500] rounded-br-lg"></div>
              
              <img
                src={testimonial.image}
                alt={`Photo of ${testimonial.name}'s pet`}
                className="w-full h-48 object-cover mb-4"
              />
              <h2 className="text-2xl text-[#FFA500] font-semibold mb-2">{testimonial.name}</h2>
              <p className="text-gray-800 italic">"{testimonial.story}"</p>
            </div>
          ))}
        </div>
  
        <div className="mt-20 text-center text-[#FFA500] text-xl font-light">
          Got a paw-some adoption story? Reach out and join the next chapter of fuzzy fame!
        </div>
      </div>
    );
  };
  
  export default Blog;