# See bottom of file for license and copyright information

=begin TML

---+!! package Foswiki::Response

Class to encapsulate response data.

Fields:
    * =status=  - response status
    * =headers= - hashref to response headers
    * =body=    - response body
    * =cookies= - hashref to response cookies

=cut

package Foswiki::Response;
use v5.14;
use Assert;

use CGI::Util ();

use Moo;
use namespace::clean;
extends qw(Foswiki::Object);
with qw(Foswiki::AppObject);

BEGIN {
    if ( $Foswiki::cfg{UseLocale} ) {
        require locale;
        import locale();
    }
}

=begin TML

---++ ClassMethod new() -> $response

Constructs a Foswiki::Response object.

=cut

=begin TML

---++ ObjectAttribute body( [ $body ] ) -> $body

Gets/Sets response body. Note that =$body= must be a byte string.
Replaces the entire body; if you want to generate the body incrementally,
use =print= instead.

Note that the =$body= returned is a byte string (utf8 encoded if =print=
was used to create it)

=cut

has body => (
    is      => 'rw',
    lazy    => 1,
    clearer => 1,
    default => '',
    trigger => sub {
        $_[0]->headers->{'Content-Length'} = length( $_[1] );
    },
);
has charset => ( is => 'rw', lazy => 1, default => 'utf-8', );

=begin TML

---++ ObjectAttribute outputHasStarted([$boolean])

Get/set the output-has-started flag. This is used by the Foswiki::Engine
to separate header and body output. Once output has started, the headers
cannot be changed (though the body can be modified)

=cut

has outputHasStarted => ( is => 'rw', lazy => 1, default => 0, );

=begin TML

---++ ObjectAttribute cookies( [ \@cookies ] ) -> @cookies

Gets/Sets response cookies. Parameter, if passed, *must* be an arrayref.

Elements may be CGI::Cookie objects or raw cookie strings.

*WARNING:* cookies set this way are *not* passed in redirects.

*NOTE:* For compatibility with the old code this attribute is handled by a
wrapper object method =cookies()= which returns a list (array) of cookies.
Methods =getCookies/setCookies= are the native handlers generated by =CPAN:Moo=.

=cut

has cookies => (
    is      => 'rw',
    lazy    => 1,
    default => sub { [] },
    isa     => Foswiki::Object::isaARRAY( 'cookies', noUndef => 1 ),
    reader  => 'getCookies',
    writer  => 'setCookies',
);
has status => (
    is      => 'rw',
    default => 200,
    trigger => sub {
        ASSERT( !$_[0]->outputHasStarted, 'Too late to change status' )
          if DEBUG;
    },
    coerce => sub {
        $_[0] =~ m/^\d{3}/ ? $_[0] : undef;
    },
);
has headers => (
    is      => 'rw',
    lazy    => 1,
    default => sub { {} },
    trigger => sub {
        my $this = shift;
        ASSERT( !$this->outputHasStarted, 'Too late to change headers' )
          if DEBUG;
        my $headers = $this->headers;
        if ( defined $headers->{'Set-Cookie'} ) {
            my @cookies =
              ref( $headers->{'Set-Cookie'} ) eq 'ARRAY'
              ? @{ $headers->{'Set-Cookie'} }
              : ( $headers->{'Set-Cookie'} );
            $this->cookies( \@cookies );
        }

        # Don't set/remove Status header as PSGI spec demands.
        if ( defined $headers->{Status} ) {
            $this->status( $headers->{Status} );
            $this->deleteHeader('Status');
        }
    },
    coerce => sub {
        my ($hdr) = @_;
        my %headers;
        while ( my ( $key, $value ) = each %$hdr ) {
            $key =~ s/(?:^|(?<=-))(.)([^-]*)/\u$1\L$2\E/g;
            $headers{$key} = $value;
        }
        $headers{Expires} = CGI::Util::expires( $headers{Expires}, 'http' )
          if defined $headers{Expires};
        $headers{Date} = CGI::Util::expires( 0, 'http' )
          if defined $headers{'Set-Cookie'} || defined $headers{Expires};
        return \%headers;
    },
);

=begin TML

---++ ObjectMethod header(-type       => $type,
                          -status     => $status,
                          -cookie     => $cookie || \@cookies,
                          -attachment => $attachName,
                          -charset    => $charset,
                          -expires    => $expires,
                          -HeaderN    => ValueN )

Sets response header. Resonably compatible with CGI. 
Doesn't support -nph, -target and -p3p.

=cut

sub header {
    my ( $this, @p ) = @_;
    my (@header);

    ASSERT( !$this->outputHasStarted, 'Too late to change headers' ) if DEBUG;

    # Ugly hack to avoid html escape in CGI::Util::rearrange
    local $CGI::Q = { escape => 0 };

    # SMELL: CGI::Util is documented as not having any public subroutines
    my ( $type, $status, $cookie, $charset, $expires, @other ) =
      CGI::Util::rearrange(
        [
            [ 'TYPE',   'CONTENT_TYPE', 'CONTENT-TYPE' ], 'STATUS',
            [ 'COOKIE', 'COOKIES' ],    'CHARSET',
            'EXPIRES',
        ],
        @p
      );

    if ( defined $charset ) {
        $this->charset($charset);
    }
    else {
        $charset = $this->charset;
    }

    foreach (@other) {

        # Don't use \s because of perl bug 21951
        next unless my ( $header, $value ) = /([^ \r\n\t=]+)=\"?(.+?)\"?$/;

        $header = lc($header);
        $header =~ s/\b(\w)/\u$1/g;
        if ( exists $this->headers->{$header} ) {
            if ( ref $this->headers->{$header} ) {
                push @{ $this->headers->{$header} }, $value;
            }
            else {
                $this->headers->{$header} =
                  [ $this->headers->{$header}, $value ];
            }
        }
        else {
            $this->headers->{$header} = $value;
        }
    }

    $type ||= 'text/html' unless defined($type);
    $charset ||= 'utf-8';

    $type .= "; charset=$charset"
      if $type ne ''
      and $type =~ m!^text/!
      and $type !~ /\bcharset\b/
      and $charset ne '';

    if ($status) {
        $this->status($status);
    }

    # push all the cookies -- there may be several
    if ($cookie) {
        my @cookies = ref($cookie) eq 'ARRAY' ? @$cookie : ($cookie);
        $this->cookies( \@cookies );
    }
    $this->headers->{Expires} = CGI::Util::expires( $expires, 'http' )
      if ( defined $expires );
    $this->headers->{Date} = CGI::Util::expires( 0, 'http' )
      if defined $expires || $cookie;

    $this->headers->{'Content-Type'} = $type if $type ne '';
}

=begin TML

---++ ObjectAttribute headers( { ... } ) -> $headersHashRef

Gets/Sets all response headers. Keys are headers name and values
are scalars for single-valued headers or arrayref for multivalued ones.

=cut

=begin TML

---++ ObjectMethod getHeader( [ $name ] ) -> $value

If called without parameters returns all present header names,
otherwise returns a list (maybe with a single element) of values
associated with $name.

=cut

sub getHeader {
    my ( $this, $hdr ) = @_;
    return keys %{ $this->headers } unless $hdr;
    $hdr =~ s/(?:^|(?<=-))(.)([^-]*)/\u$1\L$2\E/g;
    if ( exists $this->headers->{$hdr} ) {
        my $value = $this->headers->{$hdr};
        return ref $value ? @$value : ($value);
    }
    else {
        return;
    }
}

=begin TML

---++ ObjectMethod generateHTTPHeaders( \%hopts )

All parameters are optional.
   * =\%hopts - optional ref to partially filled in hash of headers (will be written to)

=cut

sub generateHTTPHeaders {
    my ( $this, $hopts ) = @_;

    my $app = $this->app;
    my $req = $app->request;

    $hopts ||= {};

    # DEPRECATED plugins header handler. Plugins should use
    # modifyHeaderHandler instead.
    my $pluginHeaders = $app->plugins->dispatch( 'writeHeaderHandler', $req )
      || '';
    if ($pluginHeaders) {
        foreach ( split /\r?\n/, $pluginHeaders ) {

            # Implicit untaint OK; data from plugin handler
            if (m/^([\-a-z]+): (.*)$/i) {
                $hopts->{$1} = $2;
            }
        }
    }

    my $contentType = $hopts->{'Content-Type'};
    $contentType = 'text/html' unless $contentType;
    $contentType .= '; charset=utf-8'
      if $contentType =~ m!^text/!
      && $contentType !~ /\bcharset\b/;

    # use our version of the content type
    $hopts->{'Content-Type'} = $contentType;

    $hopts->{'X-FoswikiAction'} = $req->action;
    $hopts->{'X-FoswikiURI'}    = $req->uri;

    # Turn off XSS protection in DEBUG so it doesn't mask problems
    $hopts->{'X-XSS-Protection'} = 0 if DEBUG;

    $app->plugins->dispatch( 'modifyHeaderHandler', $hopts, $req );

    # The headers method resets all headers to what we pass
    # what we want is simply ensure our headers are there
    $this->setDefaultHeaders($hopts);
}

=begin TML

---++ ObjectMethod setDefaultHeaders( { $name => $value, ... } )

Sets the header corresponding to the key => value pairs passed in the
hash, if the key doesn't already exist, otherwise does nothing.
This ensures some default values are entered, but they can be overridden
by plugins or other parts in the code.

=cut

sub setDefaultHeaders {
    my ( $this, $hopt ) = @_;
    return unless $hopt && keys %$hopt;
    my $headers = $this->headers;
    while ( my ( $hdr, $value ) = each %$hopt ) {
        $hdr =~ s/(?:^|(?<=-))(.)([^-]*)/\u$1\L$2\E/g;
        unless ( exists $headers->{$hdr} ) {
            if ( $hdr eq 'Status' ) {
                $this->status($value);
                next;    # Don't set the Status header implicitly.
            }
            elsif ( $hdr eq 'Expires' ) {
                $value = CGI::Util::expires( $value, 'http' );
            }
            elsif ( $hdr eq 'Set-Cookie' ) {
                my @cookies = ref($value) eq 'ARRAY' ? @$value : ($value);
                $this->cookies( \@cookies );
            }
            $headers->{$hdr} = $value;
        }
    }
    $headers->{Date} = CGI::Util::expires( 0, 'http' )
      if !exists $headers->{Date}
      && ( defined $headers->{Expires}
        || defined $headers->{'Set-Cookie'} );
}

=begin TML

---++ ObjectMethod printHeaders()

Deprecated.

Return a string of all headers, encoded as UTF8 and separated by CRLF

=cut

sub printHeaders {
    my $this = shift;

    my $headers = $this->app->engine->stringifyHeaders( $this->as_array );
    return $headers;
}

=begin TML

---++ ObjectMethod deleteHeader($h1, $h2, ...)

Deletes headers whose names are passed.

=cut

sub deleteHeader {
    my $this = shift;

    ASSERT( !$this->outputHasStarted, 'Too late to change headers' ) if DEBUG;

    foreach (@_) {
        ( my $hdr = $_ ) =~ s/(?:^|(?<=-))(.)([^-]*)/\u$1\L$2\E/g;
        delete $this->headers->{$hdr};
    }
}

=begin TML

---++ ObjectMethod pushHeader( $name, $value )

Adds $value to list of values associated with header $name.

=cut

sub pushHeader {
    my ( $this, $hdr, $value ) = @_;

    ASSERT( !$this->outputHasStarted, 'Too late to change headers' ) if DEBUG;

    $hdr =~ s/(?:^|(?<=-))(.)([^-]*)/\u$1\L$2\E/g;
    my $cur = $this->headers->{$hdr};
    if ($cur) {
        if ( ref $cur ) {
            push @{ $this->headers->{$hdr} }, $value;
        }
        else {
            $this->headers->{$hdr} = [ $cur, $value ];
        }
    }
    else {
        $this->headers->{$hdr} = $value;
    }
}

# Wrapper method for the object attribute.
sub cookies {
    my $this = shift;
    $this->setCookies(@_) if @_;
    return @{ $this->getCookies };
}

=begin TML

---++ ObjectMethod redirect( $uri, $status, $cookies |
                             -Location => $uri, 
                             -Status   => $status, 
                             -Cookies  => $cookies )

Populate object with redirect response headers.

=$uri= *must* be passed. Others are optional.

CGI Compatibility Note: It doesn't support -target or -nph

=cut

sub redirect {
    my ( $this, @p ) = @_;
    ASSERT( !$this->outputHasStarted, 'Too late to redirect' ) if DEBUG;
    my ( $url, $status, $cookies ) = CGI::Util::rearrange(
        [ [qw(LOCATION URL URI)], 'STATUS', [qw(COOKIE COOKIES)], ], @p );

    return unless $url;

    $status = 302 unless $status;
    ASSERT(
        $status =~ m/^30\d( [^\r\n]*)?$/,
        "Not a valid redirect status: '$status'"
    ) if DEBUG;
    return if ( $status && $status !~ /^\s*3\d\d.*/ );

    my @headers = ( -Location => $url );
    push @headers, '-Status' => $status;
    push @headers, '-Cookie' => $cookies if $cookies;
    $this->header(@headers);
}

=begin TML

---++ ObjectMethod print(...)

Add text content to the end of the body. Content may be unicode.
Use $response->body() to output un-encoded byte strings / binary data

=cut

sub print {
    my $this = shift;
    $this->body('') unless defined $this->body;
    $this->body( $this->body . Foswiki::encode_utf8( join( '', @_ ) ) );
}

# This method was used by FoswikiTestCase only.
sub __deprecated_finalize {
    my $this = shift;

    Foswiki::Exception::Fatal->throw( text => ref($this)
          . "::finalize() was called when output has already started" )
      if $this->outputHasStarted;

    my $req = $this->app->request;

    $req->deleteUploads;

    # Finalize cookies.
    # SMELL: Review comment below, from CGI:
    #    if the user indicates an expiration time, then we need
    #    both an Expires and a Date header (so that the browser is
    #    uses OUR clock)
    $this->pushHeader( 'Set-Cookie',
        Scalar::Util::blessed($_)
          && $_->isa('CGI::Cookie') ? $_->as_string : $_ )
      foreach $this->cookies;

    # Finalize the rest of the headers.
    if ( $req && $req->method && uc( $req->method ) eq 'HEAD' ) {
        $this->clear_body;
        $this->deleteHeader('Content-Length');
    }

    # Comply to PSGI specs.
    if ( $this->status =~ /^(1..|204|304)$/ ) {
        $this->deleteHeader(qw(Content-Type Content-Length));
    }
    $this->deleteHeader('Status');
}

=begin TML

---++ ObjectMethod as_array() => \@returnArray

Forms and return 3-element return array as described by PSGI specs.

This methods neither set nor check =outputHasStarted= attribute.

=cut

sub as_array {
    my $this = shift;

    # SMELL This is a first approach code. Doesn't take into account cases like
    # body being a IO::Handle object; or when response is delayed and body is
    # streamed.

    my @rc = ( 0, [], [] );

    my $headers = $this->headers;

    ASSERT( !defined $headers->{Status},
        "the Status header is not set implicitly" )
      if DEBUG;

    $rc[0] = $this->status;

    foreach my $hdr ( $this->getHeader ) {
        my $val = $headers->{$hdr};
        $val = [$val] unless ref($val);

        # Generate multiple header entries – one per value.
        push @{ $rc[1] }, $hdr => $_ foreach @$val;
    }

    $rc[2] = [ $this->body ];

    return \@rc;
}

1;
__END__
Foswiki - The Free and Open Source Wiki, http://foswiki.org/

Copyright (C) 2008-2010 Foswiki Contributors. Foswiki Contributors
are listed in the AUTHORS file in the root of this distribution.
NOTE: Please extend that file, not this notice.

Additional copyrights apply to some or all of the code in this
file as follows:

Copyright (C) 1999-2007 Peter Thoeny, peter@thoeny.org
and TWiki Contributors. All Rights Reserved. TWiki Contributors
are listed in the AUTHORS file in the root of this distribution.

This module is based/inspired on Catalyst framework, and also CGI,
CGI::Simple and HTTP::Headers modules. Refer to
http://search.cpan.org/~mramberg/Catalyst-Runtime-5.7010/lib/Catalyst.pm,
http://search.cpan.org/~lds/CGI.pm-3.29/CGI.pm and
http://search.cpan.org/author/ANDYA/CGI-Simple-1.103/lib/CGI/Simple.pm
http://search.cpan.org/~gaas/libwww-perl-5.808/lib/HTTP/Headers.pm
for credits and liscence details.

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version. For
more details read LICENSE in the root of this distribution.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

As per the GPL, removal of this notice is prohibited.
