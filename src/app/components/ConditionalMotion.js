import { motion } from "framer-motion";

export const ConditionalMotion = ({ 
  animate = true, 
  children, 
  whileHover, 
  whileTap,
  className,
  style,
  layoutId,
  initial,
  transition,
  ...props 
}) => {
  if (!animate) {
    return (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      whileHover={whileHover}
      whileTap={whileTap}
      layoutId={layoutId}
      initial={initial}
      transition={transition}
      {...props}
    >
      {children}
    </motion.div>
  );
};
