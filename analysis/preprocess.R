read_csv('./data/live11/participant.csv') %>%
  rbind(read_csv('./data/live13/participant.csv')) %>%
  mutate(duration = end_time - creation_time)

messages1 <- read_csv('../data/live11/info.csv') %>%
  filter(contents == 'chatMessage') %>%
  pull(details) %>%
  map_dfr(jsonlite::fromJSON)

messages2 <- read_csv('../data/live13/info.csv') %>%
  filter(contents == 'chatMessage') %>%
  pull(details) %>%
  map_dfr(jsonlite::fromJSON)%>% 
  mutate(networkid = networkid + 20, 
         participantid = participantid + 80)

messages <- rbind(messages1, messages2) %>%
  select(-aID, -wID, -type) %>%
  arrange(networkid, roomid) %>%
  mutate(bonus = round(bonus, 2))

write_csv(messages, './data/messages.csv')

clicks1 <- read_csv('../data/live11/info.csv') %>% 
  filter(contents == 'clickedObj') %>%
  pull(details) %>% 
  map_dfr(jsonlite::fromJSON) 

clicks2 <- read_csv('../data/live13/info.csv') %>% 
  filter(contents == 'clickedObj') %>%
  pull(details) %>% 
  map_dfr(jsonlite::fromJSON) %>% 
  mutate(networkid = networkid + 20, 
         participantid = participantid + 80)

clicks <- rbind(clicks1, clicks2) %>%
  select(-aID, -wID, -type) %>%
  arrange(networkid, roomid) %>%
  mutate(bonus = round(bonus, 2))

write_csv(clicks, './data/clicks.csv')

connects <- read_csv('./data/live11/info.csv') %>%
  rbind(read_csv('./data/live13/info.csv')) %>%
  select(-workerid, -assignmentid)
