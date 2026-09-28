<script lang="ts" module>
	import {
		Accessibility,
		Apple,
		BookOpen,
		Brain,
		Bus,
		Calendar,
		CircleChevronDown,
		Clock,
		Dumbbell,
		Ear,
		Eye,
		Flag,
		GraduationCap,
		Hand,
		Hash,
		Heart,
		House,
		Languages,
		MapPin,
		MessageCircle,
		Mic,
		Music,
		Puzzle,
		School,
		Sparkles,
		SquareCheck,
		Star,
		Tag,
		User,
		Users
	} from '@lucide/svelte';

	/** The icons a Property can use, by stored name. */
	export const PROPERTY_ICONS = {
		'graduation-cap': GraduationCap,
		user: User,
		users: Users,
		school: School,
		'book-open': BookOpen,
		languages: Languages,
		mic: Mic,
		'message-circle': MessageCircle,
		ear: Ear,
		eye: Eye,
		hand: Hand,
		brain: Brain,
		puzzle: Puzzle,
		accessibility: Accessibility,
		heart: Heart,
		star: Star,
		sparkles: Sparkles,
		flag: Flag,
		tag: Tag,
		hash: Hash,
		calendar: Calendar,
		clock: Clock,
		house: House,
		'map-pin': MapPin,
		bus: Bus,
		apple: Apple,
		music: Music,
		dumbbell: Dumbbell,
		'circle-chevron-down': CircleChevronDown,
		'square-check': SquareCheck
	} as const;

	export const ICON_NAMES = Object.keys(PROPERTY_ICONS) as (keyof typeof PROPERTY_ICONS)[];
</script>

<script lang="ts">
	let { name, size = 14 }: { name: string; size?: number } = $props();
	const Icon = $derived(PROPERTY_ICONS[name as keyof typeof PROPERTY_ICONS] ?? Tag);
</script>

<Icon {size} />
