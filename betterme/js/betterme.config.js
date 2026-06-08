window.bettermeConfig = {
  app: {
    name: "betterme",
    brand: "BetterMe",
    headerTitle: "My Profile",
    continueLabel: "CONTINUE",
    backLabel: "Go back",
    menuLabel: "Open menu",
    progressLabel: "Quiz progress"
  },
  screens: [
    {
      type: 0,
      key: "focus",
      eyebrow: "Personalized plan",
      title: "Choose your main focus",
      description: "Select the plan style that feels right for you.",
      selectionRequired: false,
      autoNextOnSelect: true,
      options: [
        {
          label: "Build strength",
          value: "strength",
          image: "tmp/strength.svg",
          alt: "Person doing strength training"
        },
        {
          label: "Feel healthier",
          value: "wellness",
          image: "tmp/wellness.svg",
          alt: "Wellness routine illustration"
        }
      ]
    },
    {
      type: 1,
      key: "goal",
      title: "What’s your main goal?",
      description: "This helps us shape your daily plan.",
      selectionRequired: true,
      options: [
        {
          label: "Lose weight",
          value: "lose-weight"
        },
        {
          label: "Gain muscle mass",
          value: "gain-muscle"
        },
        {
          label: "Improve flexibility",
          value: "flexibility"
        }
      ]
    },
    {
      type: 3,
      key: "solution",
      icon: "💪",
      title: "We have just the solution!",
      paragraphs: [
        "BetterMe doesn't believe in one-size-fits-all approaches.",
        "We'll create a personalized plan to help you reach your goal at your own pace and with pleasure!"
      ],
      emphasis: ["personalized plan", "your own pace"]
    },
    {
      type: 1,
      key: "activity",
      title: "How active are you now?",
      description: "Choose the closest match.",
      selectionRequired: true,
      options: [
        {
          label: "Not active",
          value: "not-active"
        },
        {
          label: "Lightly active",
          value: "lightly-active"
        },
        {
          label: "Moderately active",
          value: "moderately-active"
        },
        {
          label: "Very active",
          value: "very-active"
        }
      ]
    },
    {
      type: 4,
      key: "profile",
      title: "Let’s personalize your plan",
      description: "Add a few details so the plan feels practical for your routine.",
      fields: [
        {
          label: "First name",
          name: "firstName",
          type: "text",
          autocomplete: "given-name",
          required: true
        },
        {
          label: "Age",
          name: "age",
          type: "number",
          inputmode: "numeric",
          required: true
        }
      ]
    },
    {
      type: 3,
      key: "ready",
      icon: "✓",
      title: "Your sample plan is ready",
      paragraphs: [
        "Your answers were saved locally for this demo.",
        "You can connect this flow to a real service later using wc.publish payloads."
      ],
      emphasis: ["saved locally", "wc.publish"]
    }
  ]
};
