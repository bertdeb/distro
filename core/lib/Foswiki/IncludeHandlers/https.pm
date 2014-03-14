# See bottom of file for license and copyright information

=begin TML

---+ package Foswiki::IncludeHandlers::https

This package is designed to be lazy-loaded when Foswiki sees
an INCLUDE macro with the https: protocol. It relies on
Foswiki::IncludeHandlers::http for implementation.

=cut

package Foswiki::IncludeHandlers::https;

use strict;
use warnings;

use Foswiki::IncludeHandlers::http ();
our @ISA = qw( Foswiki::IncludeHandlers::http );

BEGIN {
    if ( $Foswiki::cfg{UseLocale} ) {
        require locale;
        import locale();
    }
}

1;

__END__
Foswiki - The Free and Open Source Wiki, http://foswiki.org/

Copyright (C) 2008-2010 Foswiki Contributors. Foswiki Contributors
are listed in the AUTHORS file in the root of this distribution.
NOTE: Please extend that file, not this notice.

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version. For
more details read LICENSE in the root of this distribution.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

As per the GPL, removal of this notice is prohibited.
