window.bettermeConfig = {
    app: {
	name: "betterme",
	brand: "BetterMe",
	headerTitle: "My Profile",
	backLabel: "Go back",
	backText: "←",
	menuLabel: "Open menu",
	continueText: "CONTINUE",
	completedTitle: "Your plan is ready",
	completedText: "Your answers were saved in the browser console for this demo."
    },
    screens: [
	{
	    type: 0,
	    key: "audience",
	    title: "Choose your plan",
	    eyebrow: "Personalized program",
	    description: "Start with the option that feels closest to your current goal.",
	    options: [
		{
		    label: "Weight Loss",
		    value: "weight_loss",
		    image: "tmp/0.png",
		    alt: "Person stretching before workout"
		},
		{
		    label: "Muscle Gain",
		    value: "muscle_gain",
		    image: "tmp/1.png",
		    alt: "Person exercising with dumbbells"
		}
	    ]
	},
	{
	    type: 1,
	    key: "goal",
	    inputType: "radio",
	    title: "What’s your main goal?",
	    description: "Select one option.",
	    options: [
		{ label: "Lose weight", value: "lose_weight" },
		{ label: "Gain muscle mass", value: "gain_muscle" },
		{ label: "Improve flexibility", value: "improve_flexibility" },
		{ label: "Feel healthier", value: "feel_healthier" }
	    ]
	},
	{
	    type: 1,
	    key: "activities",
	    inputType: "checkbox",
	    title: "Which activities do you enjoy?",
	    description: "Choose one or more options.",
	    options: [
		{ label: "Walking", value: "walking" },
		{ label: "Yoga", value: "yoga" },
		{ label: "Cycling", value: "cycling" },
		{ label: "Strength training", value: "strength_training" }
	    ]
	},
	{
	    type: 3,
	    key: "solution",
	    icon: "💪",
	    title: "We have just the solution!",
	    paragraphs: [
		"BetterMe doesn't believe in one-size-fits-all approaches.",
		"We'll create a personalized plan to help you move at your own pace and with pleasure!"
	    ]
	},
	{
	    type: 4,
	    key: "profile",
	    title: "Create your profile",
	    description: "This sample screen shows floating labels and shared footer behavior.",
	    fields: [
		{ label: "First name", name: "firstName", type: "text", autocomplete: "given-name" },
		{ label: "Email address", name: "email", type: "email", autocomplete: "email" }
	    ]
	}
    ]
};
