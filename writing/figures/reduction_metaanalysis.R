library(tidyverse)

t = data.frame(r1 = c(8,41,10,12,17,17,6.25,7.7,10.7,9,12,9,28), 
               r6 = c(1.3,8,2.5,4,8,12,2,2.7,4,2,3.3,2,7),
               orig = c(T,T,rep(F, 11)))

t %>% 
  mutate(last = r6/r1) %>% 
  mutate(first = 1) %>% 
  select(first, last, orig) %>% 
  mutate(n = row_number()) %>% 
  gather(round, `% reduction`, first, last)  %>% 
  ggplot(aes(x = round, y = `% reduction`, color = orig, group = n)) + 
    geom_line() + 
    geom_point() +
    theme_bw() +
    theme(aspect.ratio = 1) +
    scale_color_manual(values = c('black', 'red'))
  

ggsave('~/Repos/tangrams/writing/review/figures/reduction.pdf', height = 4, width=4)
