import { useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { ArrowsOutIcon as ArrowsOut } from '@phosphor-icons/react/dist/icons/ArrowsOut';
import { CheckIcon as Check } from '@phosphor-icons/react/dist/icons/Check';
import { CursorIcon as Cursor } from '@phosphor-icons/react/dist/icons/Cursor';
import { MinusIcon as Minus } from '@phosphor-icons/react/dist/icons/Minus';
import { PlusIcon as Plus } from '@phosphor-icons/react/dist/icons/Plus';
import { StackIcon as Stack } from '@phosphor-icons/react/dist/icons/Stack';
import { XIcon as X } from '@phosphor-icons/react/dist/icons/X';
import { Button } from './arc/button/button';
import { ElasticSlider } from './arc/elastic-slider/elastic-slider';

export function Odometer() {
  const [count, setCount] = useState(98);
  return (
    <div className="odometer-demo">
      <div className="digits" role="status" aria-label={String(count)}>
        {String(count).padStart(3, '0').split('').map((digit, index) => (
          <span className="digit" key={index} aria-hidden="true">
            <AnimatePresence initial={false}>
              <motion.span key={digit} initial={{ y: '105%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-105%', opacity: 0 }} transition={{ type: 'spring', stiffness: 310, damping: 27 }}>
                {digit}
              </motion.span>
            </AnimatePresence>
          </span>
        ))}
      </div>
      <div className="stepper">
        <Button variant="secondary" size="sm" aria-label="Decrease count" onClick={() => setCount(value => Math.max(0, value - 1))}><Minus size={16}/></Button>
        <Button variant="secondary" size="sm" aria-label="Increase count" onClick={() => setCount(value => (value + 1) % 1000)}><Plus size={16}/></Button>
      </div>
    </div>
  );
}

export function Magnetic() {
  const [pressed, setPressed] = useState(false);
  return (
    <div className="magnet-target" onPointerMove={event => {
      if (event.pointerType === 'touch') return;
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty('--mx', (event.clientX - bounds.left - bounds.width / 2) * .32 + 'px');
      event.currentTarget.style.setProperty('--my', (event.clientY - bounds.top - bounds.height / 2) * .35 + 'px');
    }} onPointerLeave={event => {
      event.currentTarget.style.removeProperty('--mx');
      event.currentTarget.style.removeProperty('--my');
    }}>
      <div className="magnet-translate">
        <Button variant="secondary" aria-pressed={pressed} onClick={() => setPressed(!pressed)}>
          {pressed ? <Check size={16}/> : <Cursor size={16}/>}
          {pressed ? 'Connected' : 'Pull me'}
        </Button>
      </div>
    </div>
  );
}

export function Shared() {
  const [expanded, setExpanded] = useState(false);
  return (
    <LayoutGroup>
      <div className="shared-demo" data-expanded={expanded}>
        <motion.button layout type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="shared-object">
          <motion.span layout className="shared-art"><Stack size={29} weight="light"/></motion.span>
          <motion.span layout="position" className="shared-title">Form & space</motion.span>
          <motion.span layout="position" className="shared-icon">{expanded ? <X size={17}/> : <ArrowsOut size={17}/>}</motion.span>
          {expanded && <motion.span className="shared-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>A study in soft edges and shifting scale.</motion.span>}
        </motion.button>
      </div>
    </LayoutGroup>
  );
}

export function Slider() {
  return (
    <div className="slider-demo">
      <ElasticSlider label="Intensity" showText={false} showValueTooltip defaultValue={28} format={value => value + '%'}/>
    </div>
  );
}
