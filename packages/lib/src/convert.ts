import { ButtonStyle } from 'discord.js';

export const dateToJp = (date: Date) => {
	const jpDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

	const mm = jpDate.getMonth() + 1;
	const d = jpDate.getDate();
	const h = jpDate.getHours();
	const m = jpDate.getMinutes();

	return `${mm}月${d}日${h}時${m}分`;
};

export const boolToEmoji = (enable: boolean) => (enable ? ':o:' : ':x:');
export const boolToButtonStyle = (enable: boolean) =>
	enable ? ButtonStyle.Danger : ButtonStyle.Success;
