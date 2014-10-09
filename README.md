GeneticApron
============

Proof-of-concept for an interactive genetic algorithm-driven PPE suit apron design:  
Design/control of PPE suit imagery through/by local communities  

Fitness function provided by users; one-point crossover, bit-flip mutation; mutation probability per chromosome bit is initially 10%, and deceases to 0% after 20 generations.  

Chromosome: || bit 0: stripe off/on  || bits 1-24: color 1 || bits 25-48: color 2 || bits 49-54: thickenss of stripe || bits 54-63: rotation of stripe ||

Powered by Meteor.  

(hacked together over the course of 4 hours, so buyer beware)
