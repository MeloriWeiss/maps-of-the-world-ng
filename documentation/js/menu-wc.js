'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">maps-of-the-world documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#components-links"' :
                            'data-bs-target="#xs-components-links"' }>
                            <span class="icon ion-md-cog"></span>
                            <span>Components</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="components-links"' : 'id="xs-components-links"' }>
                            <li class="link">
                                <a href="components/AppComponent.html" data-type="entity-link" >AppComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AuthLayoutComponent.html" data-type="entity-link" >AuthLayoutComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/BaseLayoutComponent.html" data-type="entity-link" >BaseLayoutComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DeskListComponent.html" data-type="entity-link" >DeskListComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DiscussionCardComponent.html" data-type="entity-link" >DiscussionCardComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ErrorComponent.html" data-type="entity-link" >ErrorComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/FooterComponent.html" data-type="entity-link" >FooterComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/FormInputComponent.html" data-type="entity-link" >FormInputComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ForumDiscussionsListComponent.html" data-type="entity-link" >ForumDiscussionsListComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ForumPageComponent.html" data-type="entity-link" >ForumPageComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ForumPostCommentsComponent.html" data-type="entity-link" >ForumPostCommentsComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ForumPostComponent.html" data-type="entity-link" >ForumPostComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ForumSidebarComponent.html" data-type="entity-link" >ForumSidebarComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/HeaderComponent.html" data-type="entity-link" >HeaderComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ImagesSliderComponent.html" data-type="entity-link" >ImagesSliderComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/LabeledCheckboxComponent.html" data-type="entity-link" >LabeledCheckboxComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/LabeledFormFieldWrapperComponent.html" data-type="entity-link" >LabeledFormFieldWrapperComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/LoginPageComponent.html" data-type="entity-link" >LoginPageComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/MapCardComponent.html" data-type="entity-link" >MapCardComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ModeCardComponent.html" data-type="entity-link" >ModeCardComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ModsFiltersItemComponent.html" data-type="entity-link" >ModsFiltersItemComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ModsListComponent.html" data-type="entity-link" >ModsListComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ModsListSidebarComponent.html" data-type="entity-link" >ModsListSidebarComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ModsPageComponent.html" data-type="entity-link" >ModsPageComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/NavigationManagerComponent.html" data-type="entity-link" >NavigationManagerComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/PaginationComponent.html" data-type="entity-link" >PaginationComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProfilePageComponent.html" data-type="entity-link" >ProfilePageComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SearchInputComponent.html" data-type="entity-link" >SearchInputComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SignupPageComponent.html" data-type="entity-link" >SignupPageComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SvgComponent.html" data-type="entity-link" >SvgComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/WorkshopPageComponent.html" data-type="entity-link" >WorkshopPageComponent</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#directives-links"' :
                                'data-bs-target="#xs-directives-links"' }>
                                <span class="icon ion-md-code-working"></span>
                                <span>Directives</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="directives-links"' : 'id="xs-directives-links"' }>
                                <li class="link">
                                    <a href="directives/CollapsibleDirective.html" data-type="entity-link" >CollapsibleDirective</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/DateUtil.html" data-type="entity-link" >DateUtil</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/AuthService.html" data-type="entity-link" >AuthService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MockService.html" data-type="entity-link" >MockService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/NavigationHistoryService.html" data-type="entity-link" >NavigationHistoryService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/PaginationService.html" data-type="entity-link" >PaginationService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/Discussion.html" data-type="entity-link" >Discussion</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GetDiscussionsDto.html" data-type="entity-link" >GetDiscussionsDto</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GetModsDto.html" data-type="entity-link" >GetModsDto</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Mode.html" data-type="entity-link" >Mode</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SliderItem.html" data-type="entity-link" >SliderItem</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#pipes-links"' :
                                'data-bs-target="#xs-pipes-links"' }>
                                <span class="icon ion-md-add"></span>
                                <span>Pipes</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="pipes-links"' : 'id="xs-pipes-links"' }>
                                <li class="link">
                                    <a href="pipes/DateDiffPipe.html" data-type="entity-link" >DateDiffPipe</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});