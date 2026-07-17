import { PrismaClient, Proficiency, MeetingStatus, MessageType } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
];

const passwordHash = hashSync('Demo1234!', 12);

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Languages
  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    });
  }
  const langMap = new Map(languages.map((l) => [l.code, l]));

  // 2. Demo users
  const usersData = [
    {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      bio: 'Bonjour! French native looking for English and Spanish practice partners. Love cooking and photography.',
      country: 'France',
      city: 'Paris',
      native: 'fr',
      learning: [{ code: 'en', proficiency: 'C1' as Proficiency }, { code: 'es', proficiency: 'B1' as Proficiency }],
    },
    {
      name: 'Carlos García',
      email: 'carlos@example.com',
      bio: 'Hola! Spanish engineer living in Madrid. I want to improve my English and learn Japanese for travel.',
      country: 'Spain',
      city: 'Madrid',
      native: 'es',
      learning: [{ code: 'en', proficiency: 'B2' as Proficiency }, { code: 'ja', proficiency: 'A2' as Proficiency }],
    },
    {
      name: 'Yuki Tanaka',
      email: 'yuki@example.com',
      bio: '日本語ネイティブ！Japanese designer learning English and Korean. I love anime, design, and tech.',
      country: 'Japan',
      city: 'Tokyo',
      native: 'ja',
      learning: [{ code: 'en', proficiency: 'B1' as Proficiency }, { code: 'ko', proficiency: 'A2' as Proficiency }],
    },
    {
      name: 'Maria Schmidt',
      email: 'maria@example.com',
      bio: 'Deutsche Muttersprachlerin. German teacher offering German practice in exchange for English or Italian.',
      country: 'Germany',
      city: 'Berlin',
      native: 'de',
      learning: [{ code: 'en', proficiency: 'C1' as Proficiency }, { code: 'it', proficiency: 'B1' as Proficiency }],
    },
    {
      name: 'Ahmed Al-Rashid',
      email: 'ahmed@example.com',
      bio: 'متحدث بالعربية. Arabic speaker from Dubai. Learning English and French for international business.',
      country: 'UAE',
      city: 'Dubai',
      native: 'ar',
      learning: [{ code: 'en', proficiency: 'B2' as Proficiency }, { code: 'fr', proficiency: 'A2' as Proficiency }],
    },
    {
      name: 'Olga Petrova',
      email: 'olga@example.com',
      bio: 'Привет! Russian native, English teacher. Can help with Russian or English. Love literature and chess.',
      country: 'Russia',
      city: 'Moscow',
      native: 'ru',
      learning: [{ code: 'en', proficiency: 'C2' as Proficiency }, { code: 'fr', proficiency: 'B1' as Proficiency }],
    },
    {
      name: 'Wei Chen',
      email: 'wei@example.com',
      bio: '你好！Chinese developer learning English and Japanese. Can help with Mandarin in exchange.',
      country: 'China',
      city: 'Shanghai',
      native: 'zh',
      learning: [{ code: 'en', proficiency: 'B1' as Proficiency }, { code: 'ja', proficiency: 'A1' as Proficiency }],
    },
    {
      name: 'Sofia Rossi',
      email: 'sofia@example.com',
      bio: 'Ciao! Italian native speaker. I teach Italian and want to practice English and Spanish. Foodie and traveler.',
      country: 'Italy',
      city: 'Rome',
      native: 'it',
      learning: [{ code: 'en', proficiency: 'B2' as Proficiency }, { code: 'es', proficiency: 'A2' as Proficiency }],
    },
    {
      name: 'Test User',
      email: 'test@example.com',
      bio: 'Your test account. Native English speaker learning Spanish.',
      country: 'United States',
      city: 'New York',
      native: 'en',
      learning: [{ code: 'es', proficiency: 'B1' as Proficiency }],
    },
  ];

  const createdUsers: Record<string, string> = {};

  for (const u of usersData) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      createdUsers[u.email] = existing.id;
      continue;
    }

    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password: passwordHash,
        bio: u.bio,
        profile: { create: { country: u.country, city: u.city, showMap: true } },
        userLanguages: {
          create: await Promise.all([
            { languageId: (await prisma.language.findUniqueOrThrow({ where: { code: u.native } })).id, isNative: true, proficiency: 'NATIVE' as Proficiency },
            ...await Promise.all(u.learning.map(async (l) => ({ languageId: (await prisma.language.findUniqueOrThrow({ where: { code: l.code } })).id, isNative: false, proficiency: l.proficiency }))),
          ]),
        },
      },
    });
    createdUsers[u.email] = user.id;
  }

  console.log(`✅ Created/verified ${Object.keys(createdUsers).length} users`);

  const aliceId = createdUsers['alice@example.com'];
  const carlosId = createdUsers['carlos@example.com'];
  const yukiId = createdUsers['yuki@example.com'];
  const mariaId = createdUsers['maria@example.com'];
  const ahmedId = createdUsers['ahmed@example.com'];
  const testId = createdUsers['test@example.com'];
  const sofiaId = createdUsers['sofia@example.com'];
  const olgaId = createdUsers['olga@example.com'];
  const weiId = createdUsers['wei@example.com'];

  // 3. Conversations between users

  const conversationData = [
    { members: [aliceId, carlosId], messages: [
      { senderId: aliceId, content: 'Hola Carlos! ¿Cómo estás? Me gustaría practicar español contigo.' },
      { senderId: carlosId, content: '¡Hola Alice! Estoy bien, gracias. ¿Qué tal tu día?' },
      { senderId: aliceId, content: 'Muy bien! He estado practicando español viendo series en Netflix.' },
      { senderId: carlosId, content: 'Eso es genial. ¿Qué series recomiendas?' },
      { senderId: aliceId, content: 'La Casa de Papel es excelente para aprender español.' },
    ]},
    { members: [aliceId, mariaId], messages: [
      { senderId: mariaId, content: 'Hi Alice! I heard you want to practice German too?' },
      { senderId: aliceId, content: 'Yes! I love German. Can you help me with pronunciation?' },
      { senderId: mariaId, content: 'Of course! Der, die, das are the trickiest part.' },
    ]},
    { members: [testId, aliceId], messages: [
      { senderId: testId, content: 'Hey Alice! I see you are learning English. I can help!' },
      { senderId: aliceId, content: 'Hi Test User! That would be great. I want to improve my fluency.' },
      { senderId: testId, content: 'Perfect. Want to schedule a video call this weekend?' },
    ]},
  ];

  for (const conv of conversationData) {
    const existingConv = await prisma.conversation.findFirst({
      where: { members: { every: { userId: { in: conv.members } } } },
    });
    if (existingConv) continue;

    const conversation = await prisma.conversation.create({
      data: {
        members: { create: conv.members.map((uid) => ({ userId: uid })) },
      },
    });

    for (const msg of conv.messages) {
      await prisma.message.create({
        data: { conversationId: conversation.id, senderId: msg.senderId, content: msg.content },
      });
    }
  }
  console.log('✅ Created conversations with messages');

  // 4. Feed posts
  const postData = [
    { authorId: aliceId, content: 'Just finished reading "Le Petit Prince" in French for the fifth time! It gets better with every read. 📚 Qui d\'autre aime ce livre?', languageId: 'fr' },
    { authorId: carlosId, content: '¿Alguien quiere practicar español conmigo? Estoy buscando un compañero de conversación para hablar 30 minutos cada día.', languageId: 'es' },
    { authorId: yukiId, content: '日本語の勉強を始めた人に質問です。何が一番難しいですか？(For people who started learning Japanese, what is the hardest part?)', languageId: 'ja' },
    { authorId: mariaId, content: 'Ich liebe die deutsche Sprache! Aber die Grammatik kann sehr schwierig sein. Wer hat Tipps?', languageId: 'de' },
    { authorId: ahmedId, content: 'أبحث عن شخص يتحدث العربية الفصحى لممارسة المحادثة. هل من أحد؟', languageId: 'ar' },
    { authorId: testId, content: 'Hey everyone! Excited to join this community. I\'m a native English speaker learning Spanish. Would love to connect with other language learners!', languageId: 'en' },
    { authorId: sofiaId, content: 'Ciao a tutti! Sono italiana e vorrei migliorare il mio inglese. Posso aiutare con l\'italiano in cambio! 🇮🇹', languageId: 'it' },
    { authorId: olgaId, content: 'Russian word of the day: "До встречи" (Do vstrechi) - See you later! Practice it with a friend today.', languageId: 'ru' },
  ];

  for (const p of postData) {
    const lang = await prisma.language.findUnique({ where: { code: p.languageId } });
    if (!lang) continue;
    await prisma.post.create({
      data: {
        authorId: p.authorId,
        content: p.content,
        languageId: lang.id,
      },
    });
  }
  console.log('✅ Created feed posts');

  // 5. Scheduled meetings
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(20, 0, 0, 0);

  await prisma.meeting.create({
    data: {
      ownerId: testId,
      guestId: aliceId,
      title: 'English conversation practice',
      roomCode: 'MEETEN01',
      languageId: (await prisma.language.findUniqueOrThrow({ where: { code: 'en' } })).id,
      status: MeetingStatus.PENDING,
      scheduledAt: tomorrow,
    },
  });

  await prisma.meeting.create({
    data: {
      ownerId: carlosId,
      guestId: aliceId,
      title: 'Spanish/English language exchange',
      roomCode: 'MEETES02',
      languageId: (await prisma.language.findUniqueOrThrow({ where: { code: 'es' } })).id,
      status: MeetingStatus.PENDING,
      scheduledAt: dayAfter,
    },
  });

  await prisma.meeting.create({
    data: {
      ownerId: mariaId,
      title: 'German conversation circle - open to all',
      roomCode: 'MEETDE03',
      languageId: (await prisma.language.findUniqueOrThrow({ where: { code: 'de' } })).id,
      status: MeetingStatus.ACTIVE,
    },
  });

  console.log('✅ Created sample meetings');
  console.log('🎉 Seed complete!');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
