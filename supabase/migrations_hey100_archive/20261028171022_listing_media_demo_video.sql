-- Demo videos in the first screenshot slot can be a screen recording up to 500 MB.
update storage.buckets
set file_size_limit = 524288000 -- 500 MiB
where id = 'listing-media';
