export type LanguageCode = "en" | "sw" | "fr" | "pt" | "ru" | "zh";

export const SUPPORTED_LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "sw", label: "Swahili" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "zh", label: "中文" },
];

export const normalizeLanguage = (value?: string | null): LanguageCode => {
  const code = String(value || "").toLowerCase();
  return (SUPPORTED_LANGUAGES.find((item) => item.code === code)?.code || "en") as LanguageCode;
};

type PhraseSet = {
  greeting: (name: string) => string;
  askWhatToAdopt: string;
  clarify: string;
  matchIntroFound: (label: string, count: number) => string;
  matchIntroEmpty: (label: string) => string;
  wrapUp: (label: string) => string;
  wrapUpGeneric: string;
  isA: string;
  yearsOfAge: string;
  boy: string;
  girl: string;
  and: string;
};

export const PHRASES: Record<LanguageCode, PhraseSet> = {
  en: {
    greeting: (name) => (name ? `Hi, ${name}, I'm Soni.` : "Hi, I'm Soni."),
    askWhatToAdopt: "What are you looking to adopt today? Dog, cat, rabbit, bird, snake, or something else?",
    clarify: "Dog, cat, rabbit, bird, snake, tortoise, chicken, or another companion. Which one?",
    matchIntroFound: (label, count) =>
      `Got it, ${label}. Here ${count === 1 ? "is one match" : "are a few matches"}, one at a time.`,
    matchIntroEmpty: (label) => `No ${label} available right now. Tell me another kind of pet?`,
    wrapUp: (label) => `That's everyone for ${label} right now. What else would you like to adopt?`,
    wrapUpGeneric: "That's everyone for now. What else would you like to adopt?",
    isA: "A",
    yearsOfAge: "years of age",
    boy: "a boy",
    girl: "a girl",
    and: "and",
  },
  sw: {
    greeting: (name) => (name ? `Habari, ${name}, mimi ni Soni.` : "Habari, mimi ni Soni."),
    askWhatToAdopt: "Ungependa kuasili mnyama gani leo? Mbwa, paka, sungura, ndege, nyoka, au kingine?",
    clarify: "Mbwa, paka, sungura, ndege, nyoka, kobe, kuku, au mnyama mwingine. Ni yupi?",
    matchIntroFound: (label, count) =>
      `Sawa, ${label}. Hapa ${count === 1 ? "kuna mmoja anayefanana" : "kuna machache yanayofanana"}, mmoja baada ya mwingine.`,
    matchIntroEmpty: (label) => `Hakuna ${label} kwa sasa. Niambie mnyama mwingine?`,
    wrapUp: (label) => `Hao ndio wote kwa ${label} kwa sasa. Ungependa kuasili nini kingine?`,
    wrapUpGeneric: "Hao ndio wote kwa sasa. Ungependa kuasili nini kingine?",
    isA: "Ni",
    yearsOfAge: "miaka",
    boy: "wa kiume",
    girl: "wa kike",
    and: "na",
  },
  fr: {
    greeting: (name) => (name ? `Bonjour ${name}, je suis Soni.` : "Bonjour, je suis Soni."),
    askWhatToAdopt: "Qu'aimeriez-vous adopter aujourd'hui ? Chien, chat, lapin, oiseau, serpent, ou autre chose ?",
    clarify: "Chien, chat, lapin, oiseau, serpent, tortue, poule, ou un autre compagnon. Lequel ?",
    matchIntroFound: (label, count) =>
      `Compris, ${label}. Voici ${count === 1 ? "une correspondance" : "quelques correspondances"}, une à la fois.`,
    matchIntroEmpty: (label) => `Aucun ${label} disponible pour le moment. Un autre animal ?`,
    wrapUp: (label) => `C'est tout pour ${label} pour le moment. Que souhaitez-vous adopter d'autre ?`,
    wrapUpGeneric: "C'est tout pour le moment. Que souhaitez-vous adopter d'autre ?",
    isA: "Un",
    yearsOfAge: "ans",
    boy: "un garçon",
    girl: "une fille",
    and: "et",
  },
  pt: {
    greeting: (name) => (name ? `Olá ${name}, eu sou a Soni.` : "Olá, eu sou a Soni."),
    askWhatToAdopt: "O que você gostaria de adotar hoje? Cão, gato, coelho, ave, cobra, ou outra coisa?",
    clarify: "Cão, gato, coelho, ave, cobra, tartaruga, galinha, ou outro companheiro. Qual deles?",
    matchIntroFound: (label, count) =>
      `Entendi, ${label}. Aqui ${count === 1 ? "está uma opção" : "estão algumas opções"}, uma de cada vez.`,
    matchIntroEmpty: (label) => `Nenhum ${label} disponível agora. Me diga outro tipo de animal?`,
    wrapUp: (label) => `Isso é tudo para ${label} por agora. O que mais gostaria de adotar?`,
    wrapUpGeneric: "Isso é tudo por agora. O que mais gostaria de adotar?",
    isA: "Um",
    yearsOfAge: "anos de idade",
    boy: "um menino",
    girl: "uma menina",
    and: "e",
  },
  ru: {
    greeting: (name) => (name ? `Привет, ${name}, я Сони.` : "Привет, я Сони."),
    askWhatToAdopt: "Кого вы хотели бы взять сегодня? Собаку, кошку, кролика, птицу, змею или кого-то ещё?",
    clarify: "Собака, кошка, кролик, птица, змея, черепаха, курица или другой питомец. Кто именно?",
    matchIntroFound: (label, count) =>
      `Понятно, ${label}. Вот ${count === 1 ? "один вариант" : "несколько вариантов"}, по одному за раз.`,
    matchIntroEmpty: (label) => `Сейчас нет питомцев по запросу «${label}». Назовёте другого?`,
    wrapUp: (label) => `Это все варианты по «${label}» на сейчас. Кого ещё хотели бы взять?`,
    wrapUpGeneric: "Это все варианты на сейчас. Кого ещё хотели бы взять?",
    isA: "Это",
    yearsOfAge: "лет",
    boy: "мальчик",
    girl: "девочка",
    and: "и",
  },
  zh: {
    greeting: (name) => (name ? `你好，${name}，我是索尼。` : "你好，我是索尼。"),
    askWhatToAdopt: "你今天想领养什么？狗、猫、兔子、鸟、蛇，还是别的？",
    clarify: "狗、猫、兔子、鸟、蛇、乌龟、鸡，或者其他伙伴。你想要哪一种？",
    matchIntroFound: (label, count) =>
      `好的，${label}。这里${count === 1 ? "有一个匹配结果" : "有几个匹配结果"}，我们一个一个来看。`,
    matchIntroEmpty: (label) => `目前没有${label}。要不要告诉我别的宠物类型？`,
    wrapUp: (label) => `${label}就是这些了。你还想领养什么？`,
    wrapUpGeneric: "暂时就是这些了。你还想领养什么？",
    isA: "是",
    yearsOfAge: "岁",
    boy: "男生",
    girl: "女生",
    and: "和",
  },
};
