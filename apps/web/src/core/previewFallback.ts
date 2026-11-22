/**
 * previewFallback.ts — Local dev/offline fallback BirthdayContent.
 * ONLY dynamically imported inside the lazy unlocked bundle (never in Stage 1).
 */
import type { BirthdayContent } from '../../../edge-gate/src/content';

export const LOCAL_PREVIEW_FALLBACK: BirthdayContent = {
  bannerMessage: 'Happy Birthday Tine Tine!',
  scratchTickets: [
    {
      id: 'ticket-1',
      badge: '1 / 4',
      title: 'Sunny Starfish Pass',
      message:
        'Your smile makes every ordinary afternoon feel as warm and bright as a sunny beach.',
      icon: 'starfish',
      accentColor: '#FACC15',
    },
    {
      id: 'ticket-2',
      badge: '2 / 4',
      title: 'Coastal Seashell Ticket',
      message:
        'Your kindness and effortless humor have a way of turning quiet days into favorite memories.',
      icon: 'shell',
      accentColor: '#F472B6',
    },
    {
      id: 'ticket-3',
      badge: '3 / 4',
      title: 'Blue Sky Voyage',
      message:
        'I hope this new year carries you toward peaceful mornings, big wins, and endless blue skies.',
      icon: 'sailboat',
      accentColor: '#0EA5E9',
    },
    {
      id: 'ticket-4',
      badge: '4 / 4',
      title: 'Tuna Appreciation Note',
      message:
        'Thank you for being genuinely you—you deserve all the warmth and happiness today, Tine Tine!',
      icon: 'heart',
      accentColor: '#E87A45',
    },
  ],
  bottleScroll: {
    heading: 'Message From Across the Tide',
    paragraphs: [
      'A gentle wave carried this little turquoise bottle all the way to your sunny shore just for February 5, 2027.',
      'Before the sun dips into pastel twilight, someone very bear-shaped has been waiting right behind the spyglass with one more surprise.',
    ],
    footer: 'Close the scroll and look closely through the glass...',
  },
  bearDialogue: {
    lensIntro: "heyy Tine Tine it's me Josh in a bear form, I have something for you!",
    handsBack: 'I have something to give',
  },
  letter: {
    badgeLabel: 'Josh',
    body: "heyy tinee, just want to say that I appreciate you, at I'm glad na nakilala ko ang nag iisang cute na Tuna, probably marami nang nag g-great sayo that's why I want to make mine so special, crafted by the mind of the one and only Josh, orchestrated, directed, and made from the hart mwehehehe, this day is so special because this is the day that years ago you came out to the world blessed with an abundance of life and infinite possibilities, finally have a chance to meet new people, experience love, to shed tears, to feel, to experience the world as you see fit, it's not just this day that is special it's everyday you live, just look at the blue sky and you'll see how exhilirating it to just to see it, now that you realized it life begins when you realize these things, now I wonder if ano na kaya mangyayari satin this point, btw wrote this on 11/22/2026, just wrote this in advance kasi what if something happens to me? WAHAHAHAHA drama ka Josh, it's just my way of saying how much I care definately a way for someone na ma off in this generation, did you know that I have a crush on you? I mean it might be pretty obvious HAHAHAHA, I know you only see me as a friend and that's also fine by me, by now siguro OJT na'ko, and 4th year ka na, I just want to congratulate you in advance tine : )), I hope you're surrounded by nice people na totoo sayo at pinapatawa ka palagi, sana kahit gaano ka-busy or ka-stressful yung 4th year at yung life in general, wag mo kakalimutan magpahinga at alagaan sarili mo ha, you really deserve all the good things in this world tine, sobra, kahit ano mangyari satin from 11/22/2026 hanggang ngayon, whether nag-uusap pa tayo palagi or busy na tayo sa kanya-kanyang buhay, I'll always be quietly rooting for you from afar, thank you for existing and for making my days a little brighter just by being you, enjoy your special day to the fullest, eat well, make a genuine wish on your cake, and stay being the one and only cute na Tuna na nakilala ko, happy happy birthday Tine Tine!! wishing you peace, warm days, and a lifetime full of blue skies, - Josh : ))",
  },
};
