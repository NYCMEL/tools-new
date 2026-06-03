window.MTK_FSF_CONFIG = {
  app: {
    name: "mtk-fsf",
    eyebrow: "Project Worksheet",
    title: "Fullscreen Form Interface",
    subtitle: "A focused step-by-step worksheet for collecting project details.",
    reviewTitle: "Review & Submit",
    successTitle: "Answers sent",
    successMessage: "Thank you. Your project worksheet has been captured.",
    enterHint: "or press Enter",
    requiredText: "Required",
    progressLabel: "Form progress",
    questionLabel: "Question",
    submitLabel: "Send answers",
    continueLabel: "Continue",
    previousLabel: "Previous",
    editLabel: "Edit",
    resetLabel: "Start over",
    closeReviewLabel: "Back to form",
    messages: {
      required: "Please fill the field before continuing.",
      email: "Please enter a valid email address.",
      numberMin: "Please enter an amount that meets the minimum.",
      submitted: "Your answers have been submitted.",
      reset: "The form was reset."
    }
  },
  fields: [
    {
      name: "name",
      type: "text",
      label: "What's your name?",
      placeholder: "Dean Moriarty",
      required: true,
      autocomplete: "name"
    },
    {
      name: "email",
      type: "email",
      label: "What's your email address?",
      placeholder: "dean@road.us",
      required: true,
      autocomplete: "email",
      info: "We won't send you spam, we promise."
    },
    {
      name: "priority",
      type: "radio",
      label: "What's your priority for your new website?",
      required: true,
      autoAdvance: true,
      info: "This will help us know what kind of service you need.",
      options: [
        { label: "Sell things", value: "conversion", icon: "sell" },
        { label: "Become famous", value: "social", icon: "campaign" },
        { label: "Mobile market", value: "mobile", icon: "phone_iphone" }
      ]
    },
    {
      name: "color",
      type: "select",
      label: "Choose a color for your website.",
      placeholder: "Pick a color",
      required: true,
      autoAdvance: true,
      info: "We'll make sure to use it across the visual direction.",
      options: [
        { label: "Evergreen", value: "#588c75" },
        { label: "Sage", value: "#b0c47f" },
        { label: "Lemon", value: "#f3e395" },
        { label: "Apricot", value: "#f3ae73" },
        { label: "Coral", value: "#da645a" },
        { label: "Mint", value: "#79a38f" },
        { label: "Pistachio", value: "#c1d099" },
        { label: "Cream", value: "#f5eaaa" },
        { label: "Peach", value: "#f5be8f" },
        { label: "Rose", value: "#e1837b" },
        { label: "Seafoam", value: "#9bbaab" },
        { label: "Olive Mist", value: "#d1dcb2" },
        { label: "Butter", value: "#f9eec0" },
        { label: "Blush", value: "#fbdfc9" },
        { label: "Dusty Rose", value: "#f1c1bd" }
      ]
    },
    {
      name: "description",
      type: "textarea",
      label: "Describe how you imagine your new website",
      placeholder: "Describe here",
      required: false,
      rows: 5
    },
    {
      name: "budget",
      type: "number",
      label: "What's your budget?",
      placeholder: "1000",
      required: false,
      min: 100,
      step: 100,
      prefix: "$"
    }
  ]
};
