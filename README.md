GeneticApron
============

Proof-of-concept for an interactive genetic algorithm-driven PPE suit apron design:  
Design/control of PPE suit imagery through/by local communities  

Fitness function provided by users; one-point crossover, bit-flip mutation; mutation probability per chromosome bit is initially 10%, and deceases to 0% after 20 generations.  

Chromosome/phenotypical expression: gene sequence of chromosome noted in chromosome.json; phenotype logic (as a CSS style) also noted in chromosome.json. The phenotype takes the form of a JSON object, in which objects are either expressions, or conditionals that take a boolean value and evalue to one of two true/false expressions. Objects can be nested, so this decision tree can be infinitely deep. Phenotype expressions can handle variables in php-esque syntax, so that "background-color: ${color}" will evaluate if the 'color' vairable is defined in the gene sequence. Simple math expressions are also evaluated, so "${thickness3*4+10}px" will, if 'thickness3' = 2, will properly evaluate to 18.

Powered by Meteor.js

