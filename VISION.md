# UIXO — what it is for

This document preserves the original directory philosophy. The broader registry, personal/team/platform editions and intelligence direction are captured in the [master product roadmap](docs/PRODUCT-ROADMAP.md).

## The one-line version

A small directory of design and front-end resources, chosen by a person, with the reason
written down.

## What it is

Most resource directories are lists. Something crawls a feed, a page appears with five
hundred entries, and the reader is left to work out which of them are any good. The list
is the product, and it is worth roughly what it cost to assemble.

UIXO is the opposite bet: fewer things, each one picked deliberately, each with a sentence
saying why it earns its place. The curation _is_ the product. A visitor should be able to
open any listing and find a claim someone is prepared to stand behind.

That is why the tagline is **"Handpicked, not scraped."** It is a promise about method, and
every product decision should be checkable against it.

## Who it is for

Designers and front-end developers who already know what they are looking for and want to
stop searching. Someone building a landing page this week; someone who needs an icon set
that holds up at 16px; someone who wants to know which of four gradient tools is actually
worth the download.

Not: beginners looking for a tutorial, or people browsing for inspiration with no task in
hand. Those are well served elsewhere.

## The principles, and what they cost

**Featured is editorial.** It means _we reach for this_, never _this is popular_ and never
_someone paid_. Popularity is a different signal and belongs in a different sort. Paid
placement lives in its own database tables so the two cannot quietly merge — that
separation is enforced in the schema, not left to good intentions.

**Every listing carries an opinion.** The description says what the thing is and why it is
worth someone's time. If a description could have been copied from the site's own homepage,
it is not doing its job.

**Links are checked, and the date is shown.** A directory of dead links is worse than no
directory. `npm run check:links` re-requests every listing and distinguishes a genuinely
dead link from a site that simply blocks robots.

**Nothing publishes itself.** Candidates are staged, a human reads them, a human approves
them. The review queue is the quality gate and removing it would remove the point.

**No invented numbers.** No follower counts, no fabricated "trusted by" figures, no like
counts until there is something real to count. The honest brag is _every link checked on
this date_, which an algorithmic directory cannot say.

## How it is meant to grow

1. **Content first.** A well-built directory of seven listings is still a directory of
   seven listings. Volume is the thing that makes the categories real.
2. **Then discovery.** Prerendered pages, a sitemap and a feed already exist so that search
   engines can find individual listings rather than only the homepage.
3. **Then return visits.** Collections give the site a point of view; saved lists give a
   reason to come back.
4. **Then, maybe, money.** Sponsored placement clearly marked and structurally separate
   from editorial. Affiliate links are deliberately avoided while the collection is small:
   the pressure to list paid tools would corrode the only thing being sold.

## What would mean it has failed

- The descriptions start reading like marketing copy
- Featured and sponsored become indistinguishable
- Listings accumulate faster than anyone can check them
- It becomes possible to publish without a person reading it first

Any of those, and it is just another list.
