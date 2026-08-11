import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

const EMPTY_VALUE = '__carecompass_empty__'

/**
 * Accessible, controlled select with a fully themed menu.
 * Empty-string options are mapped internally because Radix reserves "" for
 * showing a placeholder.
 */
export default function Select({
  options,
  value = '',
  onValueChange,
  placeholder,
  id,
  name,
  ariaLabel,
  className = '',
  variant = 'default',
  disabled = false,
}) {
  const hasEmptyOption = options.some((option) => option.value === '')
  const radixValue = value === '' && hasEmptyOption ? EMPTY_VALUE : value

  return (
    <SelectPrimitive.Root
      value={radixValue}
      onValueChange={(nextValue) => onValueChange?.(nextValue === EMPTY_VALUE ? '' : nextValue)}
      name={name}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={`cc-select-trigger cc-select-${variant} ${className}`.trim()}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="cc-select-chevron" asChild>
          <ChevronDown size={17} aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="cc-select-content"
          position="popper"
          sideOffset={7}
          collisionPadding={12}
        >
          <SelectPrimitive.ScrollUpButton className="cc-select-scroll">
            <ChevronUp size={16} aria-hidden="true" />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="cc-select-viewport">
            {options.map((option) => {
              const itemValue = option.value === '' ? EMPTY_VALUE : option.value

              return (
                <SelectPrimitive.Item
                  key={itemValue}
                  value={itemValue}
                  disabled={option.disabled}
                  className="cc-select-item"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="cc-select-indicator">
                    <Check size={16} aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              )
            })}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="cc-select-scroll">
            <ChevronDown size={16} aria-hidden="true" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
