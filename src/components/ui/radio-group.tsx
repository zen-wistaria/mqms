"use client";

import * as React from "react";

interface RadioGroupContext {
	value: string;
	onValueChange: (value: string) => void;
}

const RadioGroupContext = React.createContext<RadioGroupContext | null>(null);

function useRadioGroup() {
	const ctx = React.useContext(RadioGroupContext);
	if (!ctx) throw new Error("RadioGroup component must wrap RadioGroupItem");
	return ctx;
}

interface RadioGroupProps {
	value: string;
	onValueChange: (value: string) => void;
	className?: string;
	children: React.ReactNode;
}

export function RadioGroup({
	value,
	onValueChange,
	className,
	children,
}: RadioGroupProps) {
	return (
		<RadioGroupContext.Provider value={{ value, onValueChange }}>
			<div className={className} role="radiogroup">
				{children}
			</div>
		</RadioGroupContext.Provider>
	);
}

interface RadioGroupItemProps {
	value: string;
	id?: string;
	className?: string;
}

export function RadioGroupItem({ value, id, className }: RadioGroupItemProps) {
	const ctx = useRadioGroup();
	const isSelected = ctx.value === value;

	return (
		<input
			type="radio"
			id={id}
			value={value}
			checked={isSelected}
			onChange={() => ctx.onValueChange(value)}
			className={className}
		/>
	);
}
